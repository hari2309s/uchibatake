"use client";

import { use } from "react";
import { JournalEntryView } from "./journal-entry";
import { NoticeView } from "./notice";
import { PlantDetail } from "./plant";
import { SpaceDetail } from "./space";

type P = { params: Promise<{ id: string }> };

export const SpaceRoute = ({ params }: P) => <SpaceDetail id={use(params).id} />;
export const PlantRoute = ({ params }: P) => <PlantDetail id={use(params).id} />;
export const JournalEntryRoute = ({ params }: P) => <JournalEntryView id={use(params).id} />;
export const NoticeRoute = ({ params }: P) => <NoticeView id={use(params).id} />;
