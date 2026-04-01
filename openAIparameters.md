The OpenAI Chat Completion API (`/v1/chat/completions`) offers a wide range of optional parameters beyond `temperature` to fine-tune model behavior, latency, and output structure.

The optional parameters generally fall into these functional categories:

### 1. Sampling & Creativity (Alternatives to Temperature)

* **`top_p` (Nucleus Sampling):** An alternative to sampling with temperature. The model considers the results of the tokens with `top_p` probability mass. For example, 0.1 means only the tokens comprising the top 10% probability mass are considered.
* *Note:* OpenAI recommends altering this or `temperature`, but not both.


* **`seed`:** If specified, the system will make a best effort to sample deterministically, such that repeated requests with the same `seed` and parameters return the same result. Determinism is not guaranteed.

### 2. Output Control & Length

* **`max_tokens` / `max_completion_tokens`:** The maximum number of tokens to generate in the chat completion.
* *Note:* `max_completion_tokens` is the newer standard (particularly for reasoning models), whereas `max_tokens` is the legacy parameter.


* **`n`:** The number of chat completion choices to generate for each input message. (Default is 1).
* **`stop`:** Up to 4 sequences where the API will stop generating further tokens. (e.g., `["\n", "User:"]`).
* **`presence_penalty`:** A number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.
* **`frequency_penalty`:** A number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.

### 3. Structured Outputs & Tooling*

*removed not needed*

### 4. Advanced Technical Parameters

* **`logit_bias`:** A JSON object that maps token IDs (from the tokenizer) to an associated bias value from -100 to 100.
* Use `-100` to ban a token completely.
* Use positive values to increase the likelihood of selection.


* **`logprobs`:** Boolean. Whether to return log probabilities of the output tokens.
* **`top_logprobs`:** An integer (0-20). Specifies how many most likely tokens to return at each position. (Requires `logprobs` to be `true`).
* **`user`:** A unique identifier representing your end-user, which can help OpenAI monitor and detect abuse.

### 6. Streaming

* **`stream`:** Boolean. If set, partial message deltas will be sent as they become available.
* **`stream_options`:** An object to configure streaming options, such as `{ "include_usage": true }` to get token usage stats at the end of a stream.

### Quick Comparison Table

| Parameter | Type | Default | Best Use Case |
| --- | --- | --- | --- |
| **top_p** | Float (0-1) | 1 | Restricting the "pool" of token choices without changing the probability curve shape. |
| **presence_penalty** | Float (-2 to 2) | 0 | forcing the model to switch topics (prevents "looping"). |
| **frequency_penalty** | Float (-2 to 2) | 0 | Reducing verbatim repetition of words/phrases. |
| **logit_bias** | Map | null | Hard-banning specific words or forcing specific tokens. |

### Recommended Next Step

Would you like to see a Python code snippet demonstrating how to implement **Structured Outputs** or **logit_bias** specifically?