let hasCompletedWelcome = false;

export const completeWelcome = () => {
  hasCompletedWelcome = true;
};

export const didCompleteWelcome = () => hasCompletedWelcome;
