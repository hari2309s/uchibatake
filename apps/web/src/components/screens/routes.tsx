"use client";

import { GrowAllYear, ShelteredYear, WinterSalads } from "./grow";
import { use } from "react";
import { JournalEntryView } from "./journal-entry";
import { NoticeView } from "./notice";
import { PlantDetail } from "./plant";
import { SpaceDetail } from "./space";
import { TaskDetail } from "./task";
import { GrowGuide, HowTo } from "./grow-guide";
import { StartPlant } from "./start-plant";
import { Timeline } from "./timeline";
import { KidJobs } from "./kid";
import { PlantLost, SeasonEnd } from "./endings";
import { FeedRack } from "./space-kinds";
import { CheckPlant } from "./check";
import { RecipeView } from "./recipe";

type P = { params: Promise<{ id: string }> };

/**
 * An id from the address, as it was saved. Ids can hold characters the address encodes (a space made in
 * onboarding is "<field>:space:balcony", and ":" arrives as "%3A"), so they're decoded before lookup.
 */
const fromUrl = (v: string) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v; // not valid encoding: use it as it is
  }
};
const useIdParam = (params: P["params"]) => fromUrl(use(params).id);

export const SpaceRoute = ({ params }: P) => <SpaceDetail id={useIdParam(params)} />;
export const PlantRoute = ({ params }: P) => <PlantDetail id={useIdParam(params)} />;
export const JournalEntryRoute = ({ params }: P) => <JournalEntryView id={useIdParam(params)} />;
export const NoticeRoute = ({ params }: P) => <NoticeView id={useIdParam(params)} />;
export const TaskRoute = ({ params }: P) => <TaskDetail id={useIdParam(params)} />;
export const GrowGuideRoute = ({ params }: P) => <GrowGuide id={useIdParam(params)} />;
export const HowToRoute = ({ params }: { params: Promise<{ id: string; slug: string }> }) => {
  const { id, slug } = use(params);
  return <HowTo id={fromUrl(id)} slug={fromUrl(slug)} />;
};
export const StartRoute = ({ params, step }: { params: Promise<{ crop: string }>; step: "start" | "where" | "steps" }) => <StartPlant cropId={fromUrl(use(params).crop)} step={step} />;
export const EditPlantRoute = ({ params }: P) => <PlantDetail id={useIdParam(params)} editing />;
export const TimelineRoute = ({ params }: P) => <Timeline id={useIdParam(params)} />;
export const JournalEditRoute = ({ params }: P) => <JournalEntryView id={useIdParam(params)} editing />;
export const KidRoute = ({ params }: P) => <KidJobs memberId={useIdParam(params)} />;
export const LostRoute = ({ params }: P) => <PlantLost id={useIdParam(params)} />;
export const SeasonEndRoute = ({ params }: P) => <SeasonEnd id={useIdParam(params)} />;
export const FeedRoute = ({ params }: P) => <FeedRack id={useIdParam(params)} />;
export const CheckRoute = ({ params }: P) => <CheckPlant id={useIdParam(params)} />;
export const RecipeRoute = ({ params }: P) => <RecipeView id={useIdParam(params)} />;
export const GrowSpaceRoute = ({ params }: P) => <GrowAllYear spaceId={useIdParam(params)} />;
export const ShelteredRoute = ({ params }: P) => <ShelteredYear spaceId={useIdParam(params)} />;
export const WinterSaladsRoute = ({ params }: P) => <WinterSalads spaceId={useIdParam(params)} />;
