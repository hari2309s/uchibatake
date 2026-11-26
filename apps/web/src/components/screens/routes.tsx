"use client";

import { use } from "react";
import { JournalEntryView } from "./journal-entry";
import { NoticeView } from "./notice";
import { PlantDetail } from "./plant";
import { SpaceDetail } from "./space";
import { TaskDetail } from "./task";
import { GrowGuide, HowTo } from "./grow-guide";
import { StartPlant } from "./start-plant";
import { EditPlant } from "./edit-plant";
import { Timeline } from "./timeline";
import { JournalEditor } from "./journal-editor";
import { KidJobs } from "./kid";
import { PlantLost, SeasonEnd } from "./endings";
import { FeedRack } from "./space-kinds";

type P = { params: Promise<{ id: string }> };

export const SpaceRoute = ({ params }: P) => <SpaceDetail id={use(params).id} />;
export const PlantRoute = ({ params }: P) => <PlantDetail id={use(params).id} />;
export const JournalEntryRoute = ({ params }: P) => <JournalEntryView id={use(params).id} />;
export const NoticeRoute = ({ params }: P) => <NoticeView id={use(params).id} />;
export const TaskRoute = ({ params }: P) => <TaskDetail id={use(params).id} />;
export const GrowGuideRoute = ({ params }: P) => <GrowGuide id={use(params).id} />;
export const HowToRoute = ({ params }: { params: Promise<{ id: string; slug: string }> }) => {
  const { id, slug } = use(params);
  return <HowTo id={id} slug={slug} />;
};
export const StartRoute = ({ params, step }: { params: Promise<{ crop: string }>; step: "start" | "where" | "steps" }) => <StartPlant cropId={use(params).crop} step={step} />;
export const EditPlantRoute = ({ params }: P) => <EditPlant id={use(params).id} />;
export const TimelineRoute = ({ params }: P) => <Timeline id={use(params).id} />;
export const JournalEditRoute = ({ params }: P) => <JournalEditor id={use(params).id} />;
export const KidRoute = ({ params }: P) => <KidJobs memberId={use(params).id} />;
export const LostRoute = ({ params }: P) => <PlantLost id={use(params).id} />;
export const SeasonEndRoute = ({ params }: P) => <SeasonEnd id={use(params).id} />;
export const FeedRoute = ({ params }: P) => <FeedRack id={use(params).id} />;
