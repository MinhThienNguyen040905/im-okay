import { createRemoteHistoryApi } from "../api";
import { historyPage } from "./types.test";

const session = {
  accessToken: "access-token",
  user: { id: "user-1", email: "user@example.test" },
};
const response = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    headers: { get: jest.fn().mockReturnValue(null) },
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe("remote history API", () => {
  it("passes the opaque cursor and authenticates the request", async () => {
    const fetcher = jest.fn().mockResolvedValue(response(historyPage));
    const api = createRemoteHistoryApi(
      session,
      "https://api.example.test/",
      fetcher,
    );
    await api.getHistory("opaque+/=", 20);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/v1/history?limit=20&cursor=opaque%2B%2F%3D",
      expect.objectContaining({
        headers: { Authorization: "Bearer access-token" },
      }),
    );
  });

  it("rejects a provider field even when the response is successful", async () => {
    const fetcher = jest.fn().mockResolvedValue(
      response({
        ...historyPage,
        items: [{ ...historyPage.items[0], providerError: "secret" }],
      }),
    );
    await expect(
      createRemoteHistoryApi(session, "https://api.example.test", fetcher).getHistory(),
    ).rejects.toEqual(expect.objectContaining({ kind: "contract" }));
  });
});
