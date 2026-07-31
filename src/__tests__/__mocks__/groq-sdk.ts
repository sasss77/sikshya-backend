// Manual mock for groq-sdk — prevents the SDK from requiring GROQ_API_KEY during tests
const Groq = jest.fn().mockImplementation(() => ({
  chat: {
    completions: {
      create: jest.fn().mockImplementation((args) => {
        let content = "Mock AI response for testing";
        const isJson = args?.messages?.some((m: any) => m.content?.includes("JSON"));
        if (isJson) {
          content = JSON.stringify({ questions: [{ id: 1, question: "Q1" }] });
        }
        return Promise.resolve({
          choices: [{ message: { content } }],
        });
      }),
    },
  },
}));

export default Groq;
