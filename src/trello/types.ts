export interface Todo {
  text: string;
  done: boolean;
  assignee?: string;
  due?: string;
}

export interface Story {
  storyId: string;
  title: string;
  status: string;
  body: string;
  todos: Todo[];
  assignees: string[];
  labels: string[];
  meta: Record<string, any>;
}