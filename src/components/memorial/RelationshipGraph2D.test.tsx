import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RelationshipGraph2D from "./RelationshipGraph2D";

afterEach(cleanup);

const posts = [{ id: "test-post", authorId: "test-account", authorName: "Iris Test", relationCategory: "Amie" }];

function mountGraph() {
  const view = render(<RelationshipGraph2D deceasedName="Alpha Test" posts={posts} />);
  const canvas = view.container.querySelector(".touch-none");
  if (!canvas) throw new Error("Graph canvas missing");
  return canvas;
}

describe("Premium graph interactions", () => {
  it("bounds wheel zoom and resets zoom and pan", () => {
    const canvas = mountGraph();
    for (let i = 0; i < 20; i++) fireEvent.wheel(canvas, { deltaY: -100 });
    expect(screen.getByText("300%")).toBeInTheDocument();
    for (let i = 0; i < 30; i++) fireEvent.wheel(canvas, { deltaY: 100 });
    expect(screen.getByText("50%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(screen.getByText("100%")).toBeInTheDocument();
    const initialViewBox = canvas.querySelector("svg")?.getAttribute("viewBox");
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 40 });
    fireEvent.mouseUp(canvas);
    expect(canvas.querySelector("svg")?.getAttribute("viewBox")).not.toBe(initialViewBox);
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(canvas.querySelector("svg")?.getAttribute("viewBox")).toBe(initialViewBox);
  });

  it("pinches proportionally within bounds without panning", () => {
    const canvas = mountGraph();
    const touches = (distance: number) => [{ clientX: 0, clientY: 0 }, { clientX: distance, clientY: 0 }];
    fireEvent.touchStart(canvas, { touches: touches(100) });
    fireEvent.touchMove(canvas, { touches: touches(200) });
    expect(screen.getByText("200%")).toBeInTheDocument();
    fireEvent.touchMove(canvas, { touches: touches(1000) });
    expect(screen.getByText("300%")).toBeInTheDocument();
    fireEvent.touchMove(canvas, { touches: touches(10) });
    expect(screen.getByText("50%")).toBeInTheDocument();
    fireEvent.touchEnd(canvas, { touches: [] });
    fireEvent.touchMove(canvas, { touches: touches(300) });
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});