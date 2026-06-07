/* Generated from templates/tempo.html */
(function () {
  "use strict";

  const QUESTION_BANK = [
  {
    "id": "A1",
    "emotion": "Anxiety",
    "type": "gateway",
    "depth": null,
    "text": "When your brain starts overthinking, how bad does it get?",
    "options": [
      {
        "text": "Just background thoughts",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "A bit annoying but manageable",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Hard to ignore, ruins my focus",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Full spiral mode, can’t function",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "A2",
    "emotion": "Anxiety",
    "type": "deep",
    "depth": 1,
    "text": "How often do you replay conversations in your head?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes if it was awkward",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Pretty often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Constantly, even small interactions",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "A3",
    "emotion": "Anxiety",
    "type": "deep",
    "depth": 1,
    "text": "Do random 'what if something goes wrong' thoughts pop up?",
    "options": [
      {
        "text": "Almost never",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Occasionally",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Frequently",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "All the time, about everything",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "A4",
    "emotion": "Anxiety",
    "type": "deep",
    "depth": 1,
    "text": "When sending a risky text, you…",
    "options": [
      {
        "text": "Send and forget",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Check once",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Re-read 10 times",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Panic and regret immediately",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "A5",
    "emotion": "Anxiety",
    "type": "deep",
    "depth": 2,
    "text": "How does anxiety affect your focus?",
    "options": [
      {
        "text": "Doesn’t",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slight distraction",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Hard to focus",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Completely ruins productivity",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "A6",
    "emotion": "Anxiety",
    "type": "deep",
    "depth": 2,
    "text": "Do you struggle with decision-making?",
    "options": [
      {
        "text": "Not really",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often overthink",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Even small decisions stress me",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "A7",
    "emotion": "Anxiety",
    "type": "deep",
    "depth": 2,
    "text": "Do you need constant reassurance?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "All the time",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "A8",
    "emotion": "Anxiety",
    "type": "deep",
    "depth": 3,
    "text": "Do you catastrophize (jump to worst-case scenarios)?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost always",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "A9",
    "emotion": "Anxiety",
    "type": "deep",
    "depth": 3,
    "text": "When waiting for a reply…",
    "options": [
      {
        "text": "Chill",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Mild curiosity",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Constant checking",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Full anxiety spiral",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "A10",
    "emotion": "Anxiety",
    "type": "deep",
    "depth": 3,
    "text": "Does anxiety stop you from trying new things?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Rarely",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Yes, very often",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S1",
    "emotion": "Stress",
    "type": "gateway",
    "depth": null,
    "text": "How often do you feel like life is 'a bit too much'?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost every day",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S2",
    "emotion": "Stress",
    "type": "deep",
    "depth": 1,
    "text": "When multiple tasks pile up, you…",
    "options": [
      {
        "text": "Prioritize calmly",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Feel pressured but manage",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Get mentally overwhelmed",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Freeze or shut down",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S3",
    "emotion": "Stress",
    "type": "deep",
    "depth": 1,
    "text": "How easily do small problems ruin your mood?",
    "options": [
      {
        "text": "They don’t",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Very easily",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S4",
    "emotion": "Stress",
    "type": "deep",
    "depth": 1,
    "text": "Do you feel pressure even on 'normal' days?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Occasionally",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Frequently",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Constantly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S5",
    "emotion": "Stress",
    "type": "deep",
    "depth": 2,
    "text": "How often do you feel mentally drained?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "A few times a week",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Most days",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Every day",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S6",
    "emotion": "Stress",
    "type": "deep",
    "depth": 2,
    "text": "How’s your patience lately?",
    "options": [
      {
        "text": "Pretty solid",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly reduced",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Low",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost nonexistent",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S7",
    "emotion": "Stress",
    "type": "deep",
    "depth": 2,
    "text": "Stress makes you…",
    "options": [
      {
        "text": "More focused",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly restless",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Distracted",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Completely unproductive",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S8",
    "emotion": "Stress",
    "type": "deep",
    "depth": 3,
    "text": "When stressed, you cope by…",
    "options": [
      {
        "text": "Taking healthy breaks",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Mild distraction",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Avoidance",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Escaping completely (doom scroll / isolate)",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S9",
    "emotion": "Stress",
    "type": "deep",
    "depth": 3,
    "text": "When someone criticizes you, you…",
    "options": [
      {
        "text": "Take it calmly",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Feel mildly stressed",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Overthink it",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Feel deeply overwhelmed",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "S10",
    "emotion": "Stress",
    "type": "deep",
    "depth": 3,
    "text": "How often do you multitask because you feel pressured?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Frequently",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Constantly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O1",
    "emotion": "Overwhelm",
    "type": "gateway",
    "depth": null,
    "text": "When overwhelmed, your reaction is…",
    "options": [
      {
        "text": "Stay focused",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Get irritated",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Mentally blank",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Emotional breakdown",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O2",
    "emotion": "Overwhelm",
    "type": "deep",
    "depth": 1,
    "text": "How quickly do you feel overloaded?",
    "options": [
      {
        "text": "Only under extreme pressure",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "After a long day",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "After moderate tasks",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Very easily",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O3",
    "emotion": "Overwhelm",
    "type": "deep",
    "depth": 1,
    "text": "Does overwhelm affect your decision-making?",
    "options": [
      {
        "text": "Not really",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slight delay",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Hard to choose",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Even tiny decisions feel impossible",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O4",
    "emotion": "Overwhelm",
    "type": "deep",
    "depth": 1,
    "text": "When overwhelmed, your emotions become…",
    "options": [
      {
        "text": "Stable",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Irritated",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Very sensitive",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Uncontrollable",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O5",
    "emotion": "Overwhelm",
    "type": "deep",
    "depth": 2,
    "text": "When overwhelmed, you usually…",
    "options": [
      {
        "text": "Push through",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Take short breaks",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Avoid responsibilities",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Completely withdraw",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O6",
    "emotion": "Overwhelm",
    "type": "deep",
    "depth": 2,
    "text": "When you’re overwhelmed, you want to…",
    "options": [
      {
        "text": "Solve it",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Escape briefly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Avoid everyone",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Hide from everything",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O7",
    "emotion": "Overwhelm",
    "type": "deep",
    "depth": 2,
    "text": "How long does it take you to recover from overwhelm?",
    "options": [
      {
        "text": "Quickly",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "A few hours",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "A full day",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Multiple days",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O8",
    "emotion": "Overwhelm",
    "type": "deep",
    "depth": 3,
    "text": "When overwhelmed, you…",
    "options": [
      {
        "text": "Ask for help",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Manage quietly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Isolate",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Feel hopeless",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O9",
    "emotion": "Overwhelm",
    "type": "deep",
    "depth": 3,
    "text": "Does overwhelm affect your communication?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "I get snappy",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "I shut down",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "O10",
    "emotion": "Overwhelm",
    "type": "deep",
    "depth": 3,
    "text": "When overwhelmed, your thoughts feel…",
    "options": [
      {
        "text": "Clear",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly scattered",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Very scattered",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Completely scrambled",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L1",
    "emotion": "Loneliness",
    "type": "gateway",
    "depth": null,
    "text": "Even when you’re around people, do you feel alone?",
    "options": [
      {
        "text": "Almost never",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Very frequently",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L2",
    "emotion": "Loneliness",
    "type": "deep",
    "depth": 1,
    "text": "How often do you feel emotionally disconnected?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost constantly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L3",
    "emotion": "Loneliness",
    "type": "deep",
    "depth": 1,
    "text": "How satisfied are you with your current friendships or relationships?",
    "options": [
      {
        "text": "Very satisfied",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Mostly satisfied",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Not really",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Very dissatisfied",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L4",
    "emotion": "Loneliness",
    "type": "deep",
    "depth": 1,
    "text": "Do you feel comfortable being vulnerable with someone?",
    "options": [
      {
        "text": "Yes",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "With a few people",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "It’s hard",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "I avoid it completely",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L5",
    "emotion": "Loneliness",
    "type": "deep",
    "depth": 2,
    "text": "Do you initiate conversations?",
    "options": [
      {
        "text": "Often",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Rarely",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost never",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L6",
    "emotion": "Loneliness",
    "type": "deep",
    "depth": 2,
    "text": "Do you feel like your relationships lack depth?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strongly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L7",
    "emotion": "Loneliness",
    "type": "deep",
    "depth": 2,
    "text": "How often do you crave deeper connections?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost constantly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L8",
    "emotion": "Loneliness",
    "type": "deep",
    "depth": 3,
    "text": "How often do you wish someone understood you better?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost every day",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L9",
    "emotion": "Loneliness",
    "type": "deep",
    "depth": 3,
    "text": "Do you feel like you matter to people?",
    "options": [
      {
        "text": "Strongly yes",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "I think so",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Not really",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "I don’t feel like I do",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "L10",
    "emotion": "Loneliness",
    "type": "deep",
    "depth": 3,
    "text": "How often do you choose isolation?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost always",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U1",
    "emotion": "Uncertainty",
    "type": "gateway",
    "depth": null,
    "text": "How comfortable are you with 'not knowing' what’s next?",
    "options": [
      {
        "text": "Very comfortable",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Somewhat okay",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Not very",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "I hate it, it stresses me out",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U2",
    "emotion": "Uncertainty",
    "type": "deep",
    "depth": 1,
    "text": "Do you overthink decisions because you're scared of choosing wrong?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost always",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U3",
    "emotion": "Uncertainty",
    "type": "deep",
    "depth": 1,
    "text": "When thinking long-term (career, relationships, life), you feel…",
    "options": [
      {
        "text": "Stable",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly unsure",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Overwhelmed",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Extremely anxious",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U4",
    "emotion": "Uncertainty",
    "type": "deep",
    "depth": 1,
    "text": "Do you avoid making decisions to delay uncertainty?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Very frequently",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U5",
    "emotion": "Uncertainty",
    "type": "deep",
    "depth": 2,
    "text": "When you don’t have control over something, you feel…",
    "options": [
      {
        "text": "Calm",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly uneasy",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Very uncomfortable",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Extremely anxious",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U6",
    "emotion": "Uncertainty",
    "type": "deep",
    "depth": 2,
    "text": "Do you struggle to trust your own decisions?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strongly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U7",
    "emotion": "Uncertainty",
    "type": "deep",
    "depth": 2,
    "text": "Do you crave certainty in most areas of life?",
    "options": [
      {
        "text": "Not really",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Very strongly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U8",
    "emotion": "Uncertainty",
    "type": "deep",
    "depth": 3,
    "text": "Does uncertainty affect your confidence?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strongly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U9",
    "emotion": "Uncertainty",
    "type": "deep",
    "depth": 3,
    "text": "When you don’t have answers, your mind…",
    "options": [
      {
        "text": "Stays calm",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Wonders casually",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Overthinks",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Spirals",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "U10",
    "emotion": "Uncertainty",
    "type": "deep",
    "depth": 3,
    "text": "Does the future excite or scare you more?",
    "options": [
      {
        "text": "Mostly excites",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Balanced",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Mostly scares",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Deeply scares",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B1",
    "emotion": "Sad",
    "type": "gateway",
    "depth": null,
    "text": "How often do you think about past mistakes?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost daily",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B2",
    "emotion": "Sad",
    "type": "deep",
    "depth": 1,
    "text": "Do you replay 'what if' scenarios in your head?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Occasionally",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Constantly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B3",
    "emotion": "Sad",
    "type": "deep",
    "depth": 1,
    "text": "Do you feel like one past mistake defines you?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strongly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B4",
    "emotion": "Sad",
    "type": "deep",
    "depth": 1,
    "text": "Do you blame yourself for things that went wrong?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost always",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B5",
    "emotion": "Sad",
    "type": "deep",
    "depth": 2,
    "text": "When you think about your younger self, you feel…",
    "options": [
      {
        "text": "Compassion",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Mild embarrassment",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Disappointment",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strong regret",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B6",
    "emotion": "Sad",
    "type": "deep",
    "depth": 2,
    "text": "Do you feel like you wasted time in the past?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strongly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B7",
    "emotion": "Sad",
    "type": "deep",
    "depth": 2,
    "text": "You see someone from your past. Your first emotion is…",
    "options": [
      {
        "text": "Calm and detached",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slight emotional shift, but manageable",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "A wave of 'I wish things were different'",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "A heavy emotional hit that lingers",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B8",
    "emotion": "Sad",
    "type": "deep",
    "depth": 3,
    "text": "If you could redo one decision, you…",
    "options": [
      {
        "text": "Probably wouldn’t change much",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Might tweak something",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Definitely change it",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Change it immediately",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B9",
    "emotion": "Sad",
    "type": "deep",
    "depth": 3,
    "text": "You pass by a place connected to your past. You feel…",
    "options": [
      {
        "text": "Neutral",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly nostalgic",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Emotional",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Heavy and regretful",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "B10",
    "emotion": "Sad",
    "type": "deep",
    "depth": 3,
    "text": "If you had to describe your relationship with your past, it is…",
    "options": [
      {
        "text": "Peaceful",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Complicated",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Heavy",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Painful",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "H1",
    "emotion": "Hope",
    "type": "gateway",
    "depth": null,
    "text": "Do you believe things can improve for you?",
    "options": [
      {
        "text": "Strongly yes",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Probably",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Not sure",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Not really",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "H2",
    "emotion": "Hope",
    "type": "deep",
    "depth": 1,
    "text": "Do you feel like your efforts will pay off someday?",
    "options": [
      {
        "text": "Definitely",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Hopefully",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Doubt it",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Not at all",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "H3",
    "emotion": "Hope",
    "type": "deep",
    "depth": 1,
    "text": "When you imagine yourself 3 years from now, you feel…",
    "options": [
      {
        "text": "Inspired",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Curious",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Confused",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Blank",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "H4",
    "emotion": "Hope",
    "type": "deep",
    "depth": 1,
    "text": "Do you feel capable of building the life you want?",
    "options": [
      {
        "text": "Yes",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Mostly",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Doubtful",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "H5",
    "emotion": "Hope",
    "type": "deep",
    "depth": 2,
    "text": "Hope in your life currently feels…",
    "options": [
      {
        "text": "Strong",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Present",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Fading",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Almost gone",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "H6",
    "emotion": "Hope",
    "type": "deep",
    "depth": 2,
    "text": "When things feel uncertain, you…",
    "options": [
      {
        "text": "Stay hopeful",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Try to stay calm",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Feel anxious",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Feel hopeless",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "H7",
    "emotion": "Hope",
    "type": "deep",
    "depth": 2,
    "text": "You believe your current situation is…",
    "options": [
      {
        "text": "Temporary",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Improving",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Stuck",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Permanent",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "H8",
    "emotion": "Hope",
    "type": "deep",
    "depth": 3,
    "text": "You imagine your ideal life. It feels…",
    "options": [
      {
        "text": "Possible",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Achievable with effort",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Far away",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Unrealistic",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "H9",
    "emotion": "Hope",
    "type": "deep",
    "depth": 3,
    "text": "A friend says they believe in you. You feel…",
    "options": [
      {
        "text": "Encouraged",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Slightly comforted",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Unsure",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Like they’re wrong",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "H10",
    "emotion": "Hope",
    "type": "deep",
    "depth": 3,
    "text": "If someone asked, 'Do you think life will get better?', you'd answer…",
    "options": [
      {
        "text": "Yes",
        "score": 3,
        "intensity": 3
      },
      {
        "text": "Probably",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Not sure",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      }
    ]
  },
  {
    "id": "R1",
    "emotion": "Regret",
    "type": "gateway",
    "depth": null,
    "text": "How often do you think about past mistakes?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost daily",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "R2",
    "emotion": "Regret",
    "type": "deep",
    "depth": 1,
    "text": "Do you replay 'what if' scenarios in your head?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Occasionally",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Constantly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "R3",
    "emotion": "Regret",
    "type": "deep",
    "depth": 1,
    "text": "Do you feel like one past mistake defines you?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strongly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "R4",
    "emotion": "Regret",
    "type": "deep",
    "depth": 1,
    "text": "Do you blame yourself for things that went wrong?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost always",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "R5",
    "emotion": "Regret",
    "type": "deep",
    "depth": 2,
    "text": "When you think about your younger self, you feel…",
    "options": [
      {
        "text": "Compassion",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Mild embarrassment",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Disappointment",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strong regret",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "R6",
    "emotion": "Regret",
    "type": "deep",
    "depth": 2,
    "text": "Do you feel like you wasted time in the past?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strongly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "R7",
    "emotion": "Regret",
    "type": "deep",
    "depth": 2,
    "text": "You see someone from your past. Your first emotion is…",
    "options": [
      {
        "text": "Calm and detached",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slight emotional shift, but manageable",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "A wave of 'I wish things were different'",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "A heavy emotional hit that lingers",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "R8",
    "emotion": "Regret",
    "type": "deep",
    "depth": 3,
    "text": "If you could redo one decision, you…",
    "options": [
      {
        "text": "Probably wouldn’t change much",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Might tweak something",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Definitely change it",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Change it immediately",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "R9",
    "emotion": "Regret",
    "type": "deep",
    "depth": 3,
    "text": "You pass by a place connected to your past. You feel…",
    "options": [
      {
        "text": "Neutral",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly nostalgic",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Emotional",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Heavy and regretful",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "R10",
    "emotion": "Regret",
    "type": "deep",
    "depth": 3,
    "text": "If you had to describe your relationship with your past, it is…",
    "options": [
      {
        "text": "Peaceful",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Complicated",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Heavy",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Painful",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F1",
    "emotion": "Frustration",
    "type": "gateway",
    "depth": null,
    "text": "How easily do small problems or slow progress irritate you?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost always",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F2",
    "emotion": "Frustration",
    "type": "deep",
    "depth": 1,
    "text": "How often do you feel like you’re not progressing or falling behind?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Constantly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F3",
    "emotion": "Frustration",
    "type": "deep",
    "depth": 1,
    "text": "When others don’t meet your expectations or criticize you unfairly, you feel…",
    "options": [
      {
        "text": "Understanding or composed",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Mildly irritated",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Very frustrated",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Angry",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F4",
    "emotion": "Frustration",
    "type": "deep",
    "depth": 1,
    "text": "When something feels unfair or doesn’t work despite effort, your first thought is…",
    "options": [
      {
        "text": "“I’ll try again.”",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "“That’s annoying.”",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "“Why does this keep happening?”",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "“I’m so done.”",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F5",
    "emotion": "Frustration",
    "type": "deep",
    "depth": 2,
    "text": "When progress is slow or others move ahead faster, you feel…",
    "options": [
      {
        "text": "Patient or motivated",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slight tension or pressure",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Frustrated",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Bitter or want to quit",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F6",
    "emotion": "Frustration",
    "type": "deep",
    "depth": 2,
    "text": "How often do you feel mentally 'fed up'?",
    "options": [
      {
        "text": "Rarely",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Sometimes",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Often",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Almost daily",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F7",
    "emotion": "Frustration",
    "type": "deep",
    "depth": 2,
    "text": "After getting annoyed, how long does it take you to calm down?",
    "options": [
      {
        "text": "Quickly",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Some time",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "A long time",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Very long",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F8",
    "emotion": "Frustration",
    "type": "deep",
    "depth": 3,
    "text": "Frustration usually makes you…",
    "options": [
      {
        "text": "Reflective",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Irritable",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Withdrawn",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Angry",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F9",
    "emotion": "Frustration",
    "type": "deep",
    "depth": 3,
    "text": "Does frustration affect your tone or behavior toward others?",
    "options": [
      {
        "text": "No",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Slightly",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Noticeably",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Strongly",
        "score": 3,
        "intensity": 3
      }
    ]
  },
  {
    "id": "F10",
    "emotion": "Frustration",
    "type": "deep",
    "depth": 3,
    "text": "After a frustrating week, your overall state feels…",
    "options": [
      {
        "text": "Tired but okay",
        "score": 0,
        "intensity": 1
      },
      {
        "text": "Irritated",
        "score": 1,
        "intensity": 1
      },
      {
        "text": "Very fed up",
        "score": 2,
        "intensity": 2
      },
      {
        "text": "Completely drained",
        "score": 3,
        "intensity": 3
      }
    ]
  }
];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = QUESTION_BANK;
  }

  if (typeof window !== "undefined") {
    window.EMOTION_QUESTION_BANK = QUESTION_BANK;
  }
})();
