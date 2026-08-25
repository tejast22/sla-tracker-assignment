// backend/src/graphql/resolvers/index.ts
import { Resolvers, UserRole as GqlUserRole, TicketStatus, SlaState, Priority } from '../generated/graphql.js';
import { GraphQLError } from 'graphql';
import { AuthService } from '../../services/auth/auth.service.js';
import { SlaService, SLA_POLICIES } from '../../services/sla/sla.service.js';

const slaService = new SlaService();

export const resolvers: Resolvers = {
  Query: {
    dashboard: async (_, __, { prisma }) => {
      const tickets = await prisma.ticket.findMany({
        include: { comments: { include: { author: true } } }
      });

      let openTickets = 0;
      let inProgressTickets = 0;
      let atRiskTickets = 0;
      let breachedTickets = 0;

      const now = new Date();

      for (const t of tickets) {
        if (t.status === TicketStatus.Open) openTickets++;
        if (t.status === TicketStatus.InProgress) inProgressTickets++;

        const policy = SLA_POLICIES[t.priority as Priority];
        const holidays = await prisma.holiday.findMany();
        const holidayDates = holidays.map(h => h.date);

        const respDue = slaService.calculateDueDate(t.createdAt, policy.response, holidayDates);
        const resDue = slaService.calculateDueDate(t.createdAt, policy.resolution, holidayDates);

        const respElapsed = (Math.min(now.getTime(), respDue.getTime()) - t.createdAt.getTime()) / 60000;
        const respTotal = policy.response * 60;
        const respState = t.firstResponseAt ? SlaState.OnTrack : slaService.calculateSlaState(respElapsed, respTotal);

        const resElapsed = (Math.min(now.getTime(), resDue.getTime()) - t.createdAt.getTime()) / 60000;
        const resTotal = policy.resolution * 60;
        const resState = t.resolvedAt ? SlaState.OnTrack : slaService.calculateSlaState(resElapsed, resTotal);

        if (respState === SlaState.Breached || resState === SlaState.Breached) breachedTickets++;
        else if (respState === SlaState.AtRisk || resState === SlaState.AtRisk) atRiskTickets++;
      }

      return { openTickets, inProgressTickets, atRiskTickets, breachedTickets };
    },

    users: async (_, { role }, { prisma }) => {
      const users = await prisma.user.findMany({
        where: role ? { role: role as any } : undefined
      });
      return users.map(u => ({ ...u, role: u.role as unknown as GqlUserRole }));
    },

    holidays: async (_, __, { prisma }) => {
      const holidays = await prisma.holiday.findMany();
      return holidays.map(h => ({ ...h, date: h.date.toISOString().split('T')[0] }));
    },

    ticket: async (_, { id }, { prisma }) => {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: { reporter: true, assignee: true, comments: { include: { author: true } } }
      });
      if (!ticket) throw new GraphQLError('Ticket not found', { extensions: { code: 'TICKET_NOT_FOUND' } });

      return mapTicketToGraphQL(ticket, prisma);
    },

    tickets: async (_, args, { prisma }) => {
      const tickets = await prisma.ticket.findMany({
        where: {
          status: args.status ? (args.status as any) : undefined,
          priority: args.priority ? (args.priority as any) : undefined,
          assigneeId: args.assigneeId || undefined,
        },
        include: { reporter: true, assignee: true, comments: { include: { author: true } } },
        take: args.take || 10,
      });

      const mapped = await Promise.all(tickets.map(t => mapTicketToGraphQL(t, prisma)));
      return {
        nodes: mapped,
        pageInfo: { hasNextPage: false, endCursor: null }
      };
    }
  },

  Mutation: {
    register: async (_, { name, email, password, role }, { prisma }) => {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) throw new GraphQLError('User already exists', { extensions: { code: 'VALIDATION_ERROR' } });

      const hashedPassword = await AuthService.hashPassword(password);
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, role: role as any },
      });

      const token = AuthService.generateToken(user.id, user.role);
      return { token, user: { ...user, role: user.role as unknown as GqlUserRole } };
    },
    
    login: async (_, { email, password }, { prisma }) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new GraphQLError('User not found', { extensions: { code: 'USER_NOT_FOUND' } });

      const isValid = await AuthService.verifyPassword(password, user.password);
      if (!isValid) throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHORIZED' } });

      const token = AuthService.generateToken(user.id, user.role);
      return { token, user: { ...user, role: user.role as unknown as GqlUserRole } };
    },
    
    createTicket: async (_, { title, description, priority }, { prisma, currentUser }) => {
      if (!currentUser) throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      if (!title.trim() || !description.trim()) {
        throw new GraphQLError('Title and description cannot be empty', { extensions: { code: 'VALIDATION_ERROR' } });
      }

      const ticket = await prisma.ticket.create({
        data: {
          title,
          description,
          priority: priority as any,
          status: TicketStatus.Open,
          reporterId: currentUser.id,
        },
        include: { reporter: true, assignee: true, comments: { include: { author: true } } }
      });

      return mapTicketToGraphQL(ticket, prisma);
    },

    assignTicket: async (_, { ticketId, assigneeId }, { prisma, currentUser }) => {
      if (!currentUser || currentUser.role !== 'AGENT') {
        throw new GraphQLError('Only agents can assign tickets', { extensions: { code: 'FORBIDDEN' } });
      }

      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assignee) throw new GraphQLError('Assignee not found', { extensions: { code: 'USER_NOT_FOUND' } });

      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { assigneeId },
        include: { reporter: true, assignee: true, comments: { include: { author: true } } }
      });

      return mapTicketToGraphQL(ticket, prisma);
    },

    changeTicketStatus: async (_, { ticketId, status }, { prisma, currentUser }) => {
      if (!currentUser || currentUser.role !== 'AGENT') {
        throw new GraphQLError('Only agents can change ticket status', { extensions: { code: 'FORBIDDEN' } });
      }

      const existing = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!existing) throw new GraphQLError('Ticket not found', { extensions: { code: 'TICKET_NOT_FOUND' } });

      if (existing.status === TicketStatus.Closed && status === TicketStatus.InProgress) {
        throw new GraphQLError('Ticket cannot transition from CLOSED to IN_PROGRESS', { extensions: { code: 'INVALID_STATUS_TRANSITION' } });
      }

      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: status as any, resolvedAt: status === TicketStatus.Resolved ? new Date() : undefined },
        include: { reporter: true, assignee: true, comments: { include: { author: true } } }
      });

      return mapTicketToGraphQL(ticket, prisma);
    },

    addComment: async (_, { ticketId, content }, { prisma, currentUser }) => {
      if (!currentUser) throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      if (!content.trim()) throw new GraphQLError('Comment cannot be empty', { extensions: { code: 'VALIDATION_ERROR' } });

      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { comments: true } });
      if (!ticket) throw new GraphQLError('Ticket not found', { extensions: { code: 'TICKET_NOT_FOUND' } });

      const comment = await prisma.comment.create({
        data: { content, ticketId, authorId: currentUser.id },
        include: { author: true }
      });

      if (currentUser.role === 'AGENT' && !ticket.firstResponseAt) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { firstResponseAt: new Date() }
        });
      }

      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        author: { ...comment.author, role: comment.author.role as unknown as GqlUserRole }
      };
    },

    resolveTicket: async (_, { ticketId }, { prisma, currentUser }) => {
      if (!currentUser || currentUser.role !== 'AGENT') {
        throw new GraphQLError('Only agents can resolve tickets', { extensions: { code: 'FORBIDDEN' } });
      }

      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.Resolved, resolvedAt: new Date() },
        include: { reporter: true, assignee: true, comments: { include: { author: true } } }
      });

      return mapTicketToGraphQL(ticket, prisma);
    }
  }
};

async function mapTicketToGraphQL(ticket: any, prisma: any) {
  const policy = SLA_POLICIES[ticket.priority as Priority];
  const holidays = await prisma.holiday.findMany();
  const holidayDates = holidays.map((h: any) => h.date);

  const firstResponseDueAt = slaService.calculateDueDate(ticket.createdAt, policy.response, holidayDates);
  const resolutionDueAt = slaService.calculateDueDate(ticket.createdAt, policy.resolution, holidayDates);

  const now = new Date();
  const respElapsed = (Math.min(now.getTime(), firstResponseDueAt.getTime()) - ticket.createdAt.getTime()) / 60000;
  const respTotal = policy.response * 60;
  const firstResponseState = ticket.firstResponseAt ? SlaState.OnTrack : slaService.calculateSlaState(respElapsed, respTotal);
  const firstResponseRemainingMinutes = Math.max(0, Math.floor((firstResponseDueAt.getTime() - now.getTime()) / 60000));

  const resElapsed = (Math.min(now.getTime(), resolutionDueAt.getTime()) - ticket.createdAt.getTime()) / 60000;
  const resTotal = policy.resolution * 60;
  const resolutionState = ticket.resolvedAt ? SlaState.OnTrack : slaService.calculateSlaState(resElapsed, resTotal);
  const resolutionRemainingMinutes = Math.max(0, Math.floor((resolutionDueAt.getTime() - now.getTime()) / 60000));

  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    firstResponseAt: ticket.firstResponseAt ? ticket.firstResponseAt.toISOString() : null,
    resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
    reporter: { ...ticket.reporter, role: ticket.reporter.role as unknown as GqlUserRole },
    assignee: ticket.assignee ? { ...ticket.assignee, role: ticket.assignee.role as unknown as GqlUserRole } : null,
    comments: ticket.comments.map((c: any) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: { ...c.author, role: c.author.role as unknown as GqlUserRole }
    })),
    sla: {
      firstResponseDueAt: firstResponseDueAt.toISOString(),
      resolutionDueAt: resolutionDueAt.toISOString(),
      firstResponseState,
      resolutionState,
      firstResponseRemainingMinutes,
      resolutionRemainingMinutes,
    }
  };
}