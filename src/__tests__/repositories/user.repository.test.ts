import mongoose from "mongoose";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserById,
  findPaginatedUsers,
  deleteUserById,
} from "../../repositories/user.repository";

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeUser = (overrides = {}) => ({
  fullName: "John Doe",
  email: `john_${Date.now()}_${Math.random()}@example.com`,
  role: "student" as const,
  password: "hashed_password",
  ...overrides,
});

// ─── createUser ─────────────────────────────────────────────────────────────

describe("userRepository.createUser", () => {
  it("should create a user and return the document", async () => {
    const data = makeUser();
    const user = await createUser(data);

    expect(user._id).toBeDefined();
    expect(user.fullName).toBe(data.fullName);
    expect(user.email).toBe(data.email);
    expect(user.role).toBe("student");
  });

  it("should throw on duplicate email", async () => {
    const data = makeUser();
    await createUser(data);
    await expect(createUser(data)).rejects.toThrow();
  });
});

// ─── findUserByEmail ─────────────────────────────────────────────────────────

describe("userRepository.findUserByEmail", () => {
  it("should return user when email exists", async () => {
    const data = makeUser();
    await createUser(data);
    const found = await findUserByEmail(data.email);
    expect(found).not.toBeNull();
    expect(found!.email).toBe(data.email);
  });

  it("should return null when email does not exist", async () => {
    const found = await findUserByEmail("notexist@example.com");
    expect(found).toBeNull();
  });
});

// ─── findUserById ────────────────────────────────────────────────────────────

describe("userRepository.findUserById", () => {
  it("should return user by ID", async () => {
    const created = await createUser(makeUser());
    const found = await findUserById(created._id.toString());
    expect(found).not.toBeNull();
    expect(found!._id.toString()).toBe(created._id.toString());
  });

  it("should return null for non-existent ID", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const found = await findUserById(fakeId);
    expect(found).toBeNull();
  });
});

// ─── updateUserById ──────────────────────────────────────────────────────────

describe("userRepository.updateUserById", () => {
  it("should update user fields and return updated document", async () => {
    const user = await createUser(makeUser());
    const updated = await updateUserById(user._id.toString(), { fullName: "Jane Smith" });
    expect(updated).not.toBeNull();
    expect(updated!.fullName).toBe("Jane Smith");
  });

  it("should return null for non-existent user ID", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await updateUserById(fakeId, { fullName: "Ghost" });
    expect(result).toBeNull();
  });
});

// ─── findPaginatedUsers ──────────────────────────────────────────────────────

describe("userRepository.findPaginatedUsers", () => {
  beforeEach(async () => {
    await createUser(makeUser({ fullName: "Alice Student", email: "alice@test.com", role: "student" }));
    await createUser(makeUser({ fullName: "Bob Tutor", email: "bob@test.com", role: "tutor" }));
    await createUser(makeUser({ fullName: "Charlie Admin", email: "charlie@test.com", role: "admin" }));
  });

  it("should return paginated users with meta", async () => {
    const result = await findPaginatedUsers(1, 10, "");
    expect(result.data.length).toBeGreaterThanOrEqual(3);
    expect(result.meta.currentPage).toBe(1);
    expect(result.meta.itemsPerPage).toBe(10);
    expect(result.meta.totalItems).toBeGreaterThanOrEqual(3);
  });

  it("should filter users by role", async () => {
    const result = await findPaginatedUsers(1, 10, "", "tutor");
    expect(result.data.every((u) => u.role === "tutor")).toBe(true);
  });

  it("should search users by name", async () => {
    const result = await findPaginatedUsers(1, 10, "Alice");
    expect(result.data.some((u) => u.fullName.includes("Alice"))).toBe(true);
  });

  it("should search users by email", async () => {
    const result = await findPaginatedUsers(1, 10, "bob@test");
    expect(result.data.some((u) => u.email.includes("bob"))).toBe(true);
  });

  it("should correctly paginate results", async () => {
    const result = await findPaginatedUsers(1, 2, "");
    expect(result.data.length).toBeLessThanOrEqual(2);
    expect(result.meta.totalPages).toBeGreaterThanOrEqual(2);
  });
});

// ─── deleteUserById ──────────────────────────────────────────────────────────

describe("userRepository.deleteUserById", () => {
  it("should delete user and confirm removal", async () => {
    const user = await createUser(makeUser());
    await deleteUserById(user._id.toString());
    const found = await findUserById(user._id.toString());
    expect(found).toBeNull();
  });

  it("should return null for non-existent user", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await deleteUserById(fakeId);
    expect(result).toBeNull();
  });
});
