const { cors, handleOptions } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return cors({ error: 'Method not allowed' }, 405);

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return cors({ error: 'AI reports not configured. Set ANTHROPIC_API_KEY.' }, 503);

    const { type, studentData, classData, gameContext } = JSON.parse(event.body || '{}');

    let prompt = '';

    if (type === 'student') {
      prompt = `You are an A-Level Business Studies examiner providing a personalised performance report for a student who just completed a business simulation game.

Student Name: ${studentData.name}
Final Balance: £${studentData.balance?.toLocaleString() || '0'}
Starting Balance: £10,000
Total Revenue: £${studentData.totalRevenue?.toLocaleString() || '0'}
Total Costs: £${studentData.totalCosts?.toLocaleString() || '0'}
Total Profit: £${studentData.totalProfit?.toLocaleString() || '0'}
Profit Margin: ${studentData.totalRevenue > 0 ? ((studentData.totalProfit / studentData.totalRevenue) * 100).toFixed(1) : '0'}%
VAT Paid: £${studentData.vatPaid?.toLocaleString() || '0'}
Quiz Score: ${studentData.quizScore !== null ? studentData.quizScore + '%' : 'Not taken'}
Rounds Played: ${gameContext?.rounds || 'Unknown'}
Products Traded: ${Object.keys(studentData.inventory || {}).join(', ') || 'None'}
Class Rank: ${studentData.rank || 'Unknown'} of ${studentData.totalPlayers || 'Unknown'}

Sales History Summary: ${JSON.stringify(studentData.salesLog?.slice(-10) || [])}

Write a personalised 200-word report covering:
1. Overall performance assessment (grade: A* to U)
2. Key strengths demonstrated
3. Areas for improvement
4. Specific A-Level Business concepts they demonstrated (e.g., pricing strategies, profit margins, cash flow, taxation)
5. One actionable tip for next time

Keep the tone encouraging but honest. Use British English. Reference specific decisions they made.`;
    } else if (type === 'class') {
      prompt = `You are an A-Level Business Studies examiner writing a class performance summary after a business simulation.

Class Data:
- Number of students: ${classData.playerCount}
- Average profit: £${classData.avgProfit?.toLocaleString() || '0'}
- Highest profit: £${classData.maxProfit?.toLocaleString() || '0'} (${classData.topPlayer || 'Unknown'})
- Lowest profit: £${classData.minProfit?.toLocaleString() || '0'}
- Average quiz score: ${classData.avgQuiz || 'N/A'}%
- Total rounds: ${gameContext?.rounds || 'Unknown'}
- Crises triggered: ${gameContext?.crisisCount || 0}

Profit distribution: ${JSON.stringify(classData.profitDistribution || [])}

Write a 250-word class report covering:
1. Overall class performance
2. Key trends observed
3. Common mistakes
4. Top performers and why
5. A-Level specification links (AQA/Edexcel/OCR)
6. Suggested follow-up lesson topics

Use British English. Professional but accessible tone for a teacher audience.`;
    } else {
      return cors({ error: 'Invalid report type' }, 400);
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', errText);
      return cors({ error: 'AI service unavailable' }, 502);
    }

    const result = await response.json();
    const reportText = result.content?.[0]?.text || 'Report generation failed.';

    return cors({ ok: true, report: reportText });
  } catch (e) {
    console.error('ai-report error:', e);
    return cors({ error: 'Failed to generate report' }, 500);
  }
};
