import createStore from "zustand";
import { configurePersist } from "zustand-persist";
import { produce } from "immer";

import { findMinOffset, findMaxNormalisedDuration } from "./models/Video";

import type { Video } from "./models/Video";

interface State {
  addVideo: (video: Video) => void;
  removeVideo: (video: Video) => void;
  setActiveVideoId: (id: string | null) => void;
  setCurrentTime: (currentTime: number) => void;
  setVideoDuration: (video: Video, duration: number) => void;
  setVideoName: (video: Video, name: string) => void;
  setVideoOffset: (video: Video, offset: number) => void;
  startPlaying: () => void;
  stopPlaying: () => void;
  togglePlaying: () => void;
  toggleSlowCPUMode: () => void;

  activeVideoId: null | string;
  currentTime: number;
  maxDuration: number | null;
  playing: boolean;
  slowCPUMode: boolean;
  videos: Video[];
}

const { persist, purge } = configurePersist({
  storage: localStorage,
});

const useStore = createStore<State>(
  persist(
    {
      key: "store",
      allowlist: ["slowCPUMode"],
    },
    (set) => ({
      /**
       * Video control
       */
      addVideo: (video: Video) =>
        set((state) => ({
          activeVideoId: state.activeVideoId === null ? video.id : state.activeVideoId,
          videos: state.videos.concat([video]),
        })),

      removeVideo: (video: Video) =>
        set(
          produce((state: State) => {
            state.videos = state.videos.filter((innerVideo) => {
              return video.id !== innerVideo.id;
            });
          })
        ),

      // TODO: Combine with name update
      setVideoDuration: (video: Video, duration: number) =>
        set(
          produce((state: State) => {
            const index = state.videos.findIndex((innerVideo) => {
              return innerVideo.id === video.id;
            });

            state.videos[index].duration = duration;
          })
        ),

      // TODO: Combine with duration update
      setVideoName: (video: Video, name: string) =>
        set(
          produce((state: State) => {
            const index = state.videos.findIndex((innerVideo) => {
              return innerVideo.id === video.id;
            });

            state.videos[index].name = name;
          })
        ),

      setVideoOffset: (video: Video, offset: number) =>
        set(
          produce((state: State) => {
            const index = state.videos.findIndex((innerVideo) => {
              return innerVideo.id === video.id;
            });

            // update the set state
            state.videos[index].offset = offset;

            // recalculate the normalised offset and store against all the videos
            const minimumOffset = findMinOffset(state.videos);

            state.videos.forEach((video) => {
              video.offsetNormalised = video.offset - minimumOffset;
              video.durationNormalised = video.duration + video.offsetNormalised;
            });

            // Set the max duration of all the videos. This is used to construct the global slider
            state.maxDuration = findMaxNormalisedDuration(state.videos);
          })
        ),

      setActiveVideoId: (id: string | null) => set((state) => ({ activeVideoId: id })),

      /**
       * Play control
       */
      setCurrentTime: (currentTime: number) =>
        set((state) => {
          return {
            currentTime,
          };
        }),
      startPlaying: () => set((state) => ({ playing: true })),
      stopPlaying: () => set((state) => ({ playing: false })),
      togglePlaying: () => set((state) => ({ playing: !state.playing })),

      toggleSlowCPUMode: () => set((state) => ({ slowCPUMode: !state.slowCPUMode })),

      activeVideoId: null,
      currentTime: 0,
      maxDuration: null,
      playing: false,
      slowCPUMode: false,
      videos: [],
    })
  )
);

export default useStore;
