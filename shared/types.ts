export type CommandContext = {
  userId?: string;
  command: string;
};

export type CommandResult = {
  success: boolean;
  message: string;
};
