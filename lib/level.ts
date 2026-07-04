export function getRequiredExp(level: number) {
  return level * 100;
}

export function calculateLevelUp(currentLevel: number, currentExp: number) {
  let level = currentLevel;
  let exp = currentExp;
  let levelUpCount = 0;

  while (exp >= getRequiredExp(level)) {
    exp -= getRequiredExp(level);
    level += 1;
    levelUpCount += 1;
  }

  return {
    level,
    exp,
    levelUpCount,
    didLevelUp: levelUpCount > 0,
  };
}