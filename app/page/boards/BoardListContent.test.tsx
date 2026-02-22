import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardListContent } from "./BoardListContent";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignOut = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "user-1", displayName: "Test User", email: "test@example.com" },
    signOut: mockSignOut,
  }),
}));

const mockBoards = [
  { id: "b1", name: "Board One", createdBy: "user-1", createdAt: {} as never, starredBy: ["user-1"] as string[] },
  { id: "b2", name: "Board Two", createdBy: "user-1", createdAt: {} as never, starredBy: undefined },
];

const mockUseBoards = jest.fn(() => ({
  boards: mockBoards,
  loading: false,
  error: null,
}));
jest.mock("@/hooks/useBoards", () => ({
  useBoards: () => mockUseBoards(),
}));

const mockToggleStar = jest.fn();
jest.mock("@/hooks/useToggleBoardStar", () => ({
  useToggleBoardStar: () => ({
    toggleStar: mockToggleStar,
    togglingId: null,
    error: null,
  }),
}));

const mockOpenCreateModal = jest.fn();
const mockCloseModal = jest.fn();
const mockHandleCreate = jest.fn((e: React.FormEvent) => e.preventDefault());
jest.mock("@/hooks/useCreateBoard", () => ({
  useCreateBoard: () => ({
    name: "",
    setName: jest.fn(),
    createError: null,
    creating: false,
    showCreateModal: false,
    handleCreate: mockHandleCreate,
    closeModal: mockCloseModal,
    openCreateModal: mockOpenCreateModal,
  }),
}));

describe("BoardListContent", () => {
  beforeEach(() => {
    mockUseBoards.mockReturnValue({
      boards: [...mockBoards],
      loading: false,
      error: null,
    });
    mockPush.mockClear();
    mockToggleStar.mockClear();
    mockOpenCreateModal.mockClear();
  });

  it("renders welcome message with user display name", () => {
    render(<BoardListContent />);
    expect(screen.getByText(/Hi, Test User/)).toBeInTheDocument();
  });

  it("renders tab bar with All boards and Starred options", () => {
    render(<BoardListContent />);
    expect(screen.getByRole("tablist", { name: /Board view/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /All boards/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Starred/i })).toBeInTheDocument();
  });

  it("default view shows all boards and New board button", () => {
    render(<BoardListContent />);
    expect(screen.getByRole("tab", { name: /All boards/i, selected: true })).toBeInTheDocument();
    expect(screen.getAllByText("Board One").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Board Two")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create new board/i })).toBeInTheDocument();
  });

  it("clicking Starred tab shows starred boards only", async () => {
    render(<BoardListContent />);
    await userEvent.click(screen.getByRole("tab", { name: /Starred/i }));
    expect(screen.getByRole("tab", { name: /Starred/i, selected: true })).toBeInTheDocument();
    expect(screen.getByText("Board One")).toBeInTheDocument();
    expect(screen.queryByText("Board Two")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create new board/i })).not.toBeInTheDocument();
  });

  it("Starred tab shows empty state when no starred boards", async () => {
    mockUseBoards.mockReturnValue({
      boards: [
        { id: "b2", name: "Board Two", createdBy: "user-1", createdAt: {} as never, starredBy: undefined },
      ],
      loading: false,
      error: null,
    });
    render(<BoardListContent />);
    await userEvent.click(screen.getByRole("tab", { name: /Starred/i }));
    expect(screen.getByText(/No starred boards/)).toBeInTheDocument();
  });

  it("star button on a starred board has Unstar label and click calls toggleStar", async () => {
    render(<BoardListContent />);
    const unstarButtons = screen.getAllByRole("button", { name: /Unstar this board/i });
    expect(unstarButtons.length).toBeGreaterThanOrEqual(1);
    await userEvent.click(unstarButtons[0]);
    expect(mockToggleStar).toHaveBeenCalledWith("b1", true);
  });

  it("star button on unstarred board has Star label and click calls toggleStar", async () => {
    render(<BoardListContent />);
    const starButton = screen.getByRole("button", { name: "Star this board" });
    await userEvent.click(starButton);
    expect(mockToggleStar).toHaveBeenCalledWith("b2", false);
  });

  it("Create new board opens modal", async () => {
    render(<BoardListContent />);
    await userEvent.click(screen.getByRole("button", { name: /Create new board/i }));
    expect(mockOpenCreateModal).toHaveBeenCalled();
  });
});
