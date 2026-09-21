import { defineConfig } from "firescope"

export default defineConfig({
  project: process.env.FIRESCOPE_PROJECT,
  region: "us-central1",
  runtime: "nodejs22",
  functions: {
    source: "src/functions",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  hosting: {
    public: "public",
    cleanUrls: true,
    rewrites: [
      {
        source: "/api/hello",
        function: "hello",
      },
    ],
  },
})
