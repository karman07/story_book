export type AgeGroup = "3-5" | "6-8" | "9-12";
export type IllustrationStyle = "watercolor" | "cartoon" | "storybook" | "3D";
export type ImageStatus = "idle" | "loading" | "done" | "error";

export interface Character {
  name: string;
  description: string;
}

/** Positions and widths are percentages of the page canvas; font size is in % of canvas width. */
export interface PageElement {
  id: string;
  kind: "text" | "image";
  x: number;
  y: number;
  w: number;
  text?: string;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  panel?: boolean; // translucent cream panel behind text
  src?: string;
  blend?: boolean; // multiply blend to hide a white image background
}

export interface StoryPage {
  id: string;
  elements: PageElement[];
  pageNumber: number;
  sceneTitle: string;
  text: string;
  illustrationPrompt: string;
  characters: string[];
  image?: string; // data URL
  imageStatus: ImageStatus;
  imageError?: string;
}

export interface Book {
  id: string;
  title: string;
  synopsis: string;
  characters: Character[];
  pages: StoryPage[];
  ageGroup: AgeGroup;
  style: IllustrationStyle;
  language: string;
  idea: string;
  cover?: string;
  coverStatus: ImageStatus;
  updatedAt: number;
}

export interface StoryRequest {
  idea: string;
  title: string;
  ageGroup: AgeGroup;
  pageCount: number;
  style: IllustrationStyle;
  language: string;
}
