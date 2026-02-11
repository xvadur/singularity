import { DailyActivityStat } from "../types";

export const generateMockActivityData = (days = 112): DailyActivityStat[] => {
  const data: DailyActivityStat[] = [];
  const today = new Date();
  
  // Generate data for the last N days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Random activity simulation
    const rand = Math.random();
    let wordCount = 0;
    let promptCount = 0;

    if (rand > 0.3) {
      const intensity = Math.pow(Math.random(), 2); // Skew towards lower numbers
      wordCount = Math.floor(intensity * 4000) + 50; 
      promptCount = Math.floor(intensity * 30) + 1;
    }
    
    data.push({ date: dateStr, wordCount, promptCount });
  }
  
  // Return chronological order
  return data.reverse();
};
