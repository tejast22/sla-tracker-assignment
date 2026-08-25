// frontend/src/api/operations.ts
import { gql } from 'graphql-request';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
      }
    }
  }
`;

export const GET_DASHBOARD = gql`
  query GetDashboard {
    dashboard {
      openTickets
      inProgressTickets
      atRiskTickets
      breachedTickets
    }
  }
`;

export const GET_TICKETS = gql`
  query GetTickets($status: TicketStatus, $priority: Priority, $assigneeId: ID) {
    tickets(status: $status, priority: $priority, assigneeId: $assigneeId) {
      nodes {
        id
        title
        description
        priority
        status
        createdAt
        reporter {
          id
          name
          role
        }
        assignee {
          id
          name
        }
        sla {
          firstResponseState
          resolutionState
          firstResponseRemainingMinutes
          resolutionRemainingMinutes
        }
      }
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers($role: UserRole) {
    users(role: $role) {
      id
      name
      role
    }
  }
`;

export const CREATE_TICKET = gql`
  mutation CreateTicket($title: String!, $description: String!, $priority: Priority!) {
    createTicket(title: $title, description: $description, priority: $priority) {
      id
      title
    }
  }
`;

export const ADD_COMMENT = gql`
  mutation AddComment($ticketId: ID!, $content: String!) {
    addComment(ticketId: $ticketId, content: $content) {
      id
      content
      createdAt
      author {
        name
        role
      }
    }
  }
`;

export const ASSIGN_TICKET = gql`
  mutation AssignTicket($ticketId: ID!, $assigneeId: ID!) {
    assignTicket(ticketId: $ticketId, assigneeId: $assigneeId) {
      id
      assignee {
        name
      }
    }
  }
`;

export const CHANGE_STATUS = gql`
  mutation ChangeTicketStatus($ticketId: ID!, $status: TicketStatus!) {
    changeTicketStatus(ticketId: $ticketId, status: $status) {
      id
      status
    }
  }
`;