import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import { defaultProfile } from "@/modules/planner/model";
import { readProfile, saveProfile } from "@/modules/planner/service";
import { generateStudyPlan } from "@/modules/planner/plan";
process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
const alice = { id: "demo:profile-alice", mode: "demo" as const };
const bob = { id: "demo:profile-bob", mode: "demo" as const };
beforeAll(async () => {
  await connection();
});
afterAll(async () => {
  await (await connection()).close();
});
describe("account-owned profile storage", () => {
  it("persists goals per owner and rejects stale or forged writes", async () => {
    expect(await readProfile(alice.id)).toEqual({ state: null, revision: 0 });
    const saved = await saveProfile(alice, {
      action: "save",
      profile: { ...defaultProfile, studyDays: [0, 1, 2, 3, 4, 5, 6] },
      revision: 0,
    });
    expect((await readProfile(alice.id)).state?.profile).toEqual(
      saved.state.profile,
    );
    expect((await readProfile(bob.id)).state).toBeNull();
    await expect(
      saveProfile(alice, {
        action: "save",
        profile: defaultProfile,
        revision: 0,
      }),
    ).rejects.toThrow("another tab");
    await expect(
      saveProfile(bob, {
        action: "save",
        profile: defaultProfile,
        revision: 0,
        ownerId: alice.id,
      }),
    ).rejects.toThrow();
    const task = generateStudyPlan(saved.state, [])[0].tasks[0];
    const checked = await saveProfile(alice, {
      action: "complete",
      taskId: task.id,
      completed: true,
      revision: saved.revision,
    });
    expect(checked.state.completedTaskIds).toContain(task.id);
    expect((await readProfile(bob.id)).state).toBeNull();
    await expect(
      saveProfile(alice, {
        action: "complete",
        taskId: "2020-01-01:lesson:recognize-hazards",
        completed: true,
        revision: checked.revision,
      }),
    ).rejects.toThrow("current week");
  });
});
