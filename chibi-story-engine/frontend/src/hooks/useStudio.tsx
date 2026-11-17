import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, auth } from "../services/api";
import type { Role, StoryDetail, StorySummary } from "../types";

interface Studio {
  user: { email: string; role: Role } | null;
  stories: StorySummary[];
  storyId: string | null;
  story: StoryDetail | null;
  selectStory: (id: string | null) => void;
  refresh: () => Promise<void>;
  signOut: () => void;
  can: (...roles: Role[]) => boolean;
}

const Ctx = createContext<Studio | null>(null);
const STORY_KEY = "csae.story";

export function StudioProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Studio["user"]>(null);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [storyId, setStoryId] = useState<string | null>(localStorage.getItem(STORY_KEY));
  const [story, setStory] = useState<StoryDetail | null>(null);

  const refresh = useCallback(async () => {
    const list = await api.get<StorySummary[]>("/stories");
    setStories(list);
    const id = storyId && list.some((s) => s.id === storyId) ? storyId : (list[0]?.id ?? null);
    if (id !== storyId) setStoryId(id);
    setStory(id ? await api.get<StoryDetail>(`/stories/${id}`) : null);
  }, [storyId]);

  useEffect(() => {
    api.get<{ email: string; role: Role }>("/auth/me").then(setUser).catch(() => setUser(null));
  }, []);
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const value = useMemo<Studio>(
    () => ({
      user,
      stories,
      storyId,
      story,
      selectStory: (id) => {
        if (id) localStorage.setItem(STORY_KEY, id);
        else localStorage.removeItem(STORY_KEY);
        setStoryId(id);
      },
      refresh,
      signOut: () => {
        auth.clear();
        window.dispatchEvent(new Event("csae:signed-out"));
      },
      can: (...roles) => !!user && (user.role === "admin" || roles.includes(user.role)),
    }),
    [user, stories, storyId, story, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudio(): Studio {
  const value = useContext(Ctx);
  if (!value) throw new Error("useStudio must be used inside StudioProvider");
  return value;
}
