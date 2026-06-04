import { defineConfig } from "firescope"

export default defineConfig({
  project: process.env.FIRESCOPE_PROJECT,
  region: "us-central1",
  runtime: "nodejs20",
  functions: {
    source: "src/functions",
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
