import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Tldraw,
  TldrawApp,
  ColorStyle,
  TDAsset,
  TDBinding,
  TDShape,
  TDUser,
} from '@krapi0314/tldraw';
import * as yorkie from 'yorkie-js-sdk';
import { useThrottleCallback } from '@react-hook/throttle';

import { Box } from '@chakra-ui/react';
import useVideoStore from '../../services/stores/videos';
import useSettingsStore from '../../services/stores/settings';

import type { Video } from '../../services/models/Video';
import type { VideoBookmark } from '../../services/models/VideoBookmark';

type Props = {
  onMount: (app: TldrawApp) => void;
  scale: number;
  video: Video;
  videoBookmark: VideoBookmark | undefined;
};

// 0. Yorkie Client declaration
let client: yorkie.Client<yorkie.Indexable>;

// 0. Yorkie Document declaration
let doc: yorkie.Document<yorkie.Indexable>;

// 0. Yorkie type for typescript
type YorkieDocType = {
  shapes: Record<string, TDShape>;
  bindings: Record<string, TDBinding>;
  assets: Record<string, TDAsset>;
};

export default function Drawing({
  onMount,
  scale,
  video,
  videoBookmark,
}: Props) {
  const tlDrawRef = useRef<TldrawApp | null>(null);
  const outerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const roomId = video.name;
  const userName = 'test';

  const playing = useVideoStore((state) => state.playing);

  const setVideoBookmarkDrawing = useVideoStore(
    (state) => state.setVideoBookmarkDrawing
  );

  const clearDrawingsOnPlay = useSettingsStore(
    (state) => state.clearDrawingsOnPlay
  );

  function handleMount(app: TldrawApp) {
    tlDrawRef.current = app;
    tlDrawRef.current.setCamera([0, 0], scale, 'layout_mounted');
    tlDrawRef.current.style({ color: ColorStyle.Red });

    app.loadRoom(roomId, userName);
    app.setIsLoading(true);
    app.pause();
    onMount(app);
  }

  // Update Yorkie doc when the app's shapes change.
  // Prevent overloading yorkie update api call by throttle
  const onChangePage = useThrottleCallback(
    (
      app: TldrawApp,
      shapes: Record<string, TDShape | undefined>,
      bindings: Record<string, TDBinding | undefined>,
      assets: Record<string, TDAsset | undefined>
    ) => {
      if (!app || client === undefined || doc === undefined) return;

      doc.update((root) => {
        Object.entries(shapes).forEach(([id, shape]) => {
          if (!shape) {
            delete root.shapes[id];
          } else {
            root.shapes[id] = shape;
          }
        });

        Object.entries(bindings).forEach(([id, binding]) => {
          if (!binding) {
            delete root.bindings[id];
          } else {
            root.bindings[id] = binding;
          }
        });

        // Should store app.document.assets which is global asset storage referenced by inner page assets
        // Document key for assets should be asset.id (string), not index
        Object.entries(app.assets).forEach(([id, asset]) => {
          if (!asset) {
            delete root.assets[asset.id];
          } else {
            root.assets[asset.id] = asset;
          }
        });
      });
    },
    60,
    false
  );

  // Handle presence updates when the user's pointer / selection changes
  const onChangePresence = useThrottleCallback(
    (app: TldrawApp, user: TDUser) => {
      if (!app || client === undefined || !client.isActive()) return;

      client.updatePresence('user', user);
    },
    60,
    false
  );

  function handlePersist(app: TldrawApp) {
    if (videoBookmark === undefined || playing === true) {
      return;
    }

    setVideoBookmarkDrawing(video, videoBookmark, app.document);
  }

  const clearDrawing = useCallback(() => {
    if (tlDrawRef.current === null) {
      return;
    }

    const tool = tlDrawRef.current.useStore.getState().appState.activeTool;
    tlDrawRef.current.deleteAll();
    tlDrawRef.current.selectTool(tool);
    tlDrawRef.current.toggleToolLock();
  }, []);

  const rescaleDrawing = useCallback(() => {
    if (tlDrawRef.current === null) {
      return;
    }

    tlDrawRef.current.setCamera([0, 0], scale, 'layout_resized');
  }, [scale]);

  /**
   * Rescale drawing as parent scales
   */
  useEffect(() => {
    rescaleDrawing();
  }, [scale, rescaleDrawing]);

  /**
   * Load video bookmarks
   */
  useEffect(() => {
    if (tlDrawRef.current === null) {
      return;
    }

    if (videoBookmark?.drawing) {
      tlDrawRef.current.loadDocument(
        JSON.parse(JSON.stringify(videoBookmark.drawing)) // we need to load a copy of the document
      );

      tlDrawRef.current.selectNone();
      rescaleDrawing();
    } else {
      clearDrawing();
    }
  }, [clearDrawing, rescaleDrawing, videoBookmark]);

  /**
   * Clear drawings between time changes if enabled
   */
  useEffect(() => {
    if (tlDrawRef.current === null) {
      return;
    }

    if (clearDrawingsOnPlay === true && playing === true) {
      clearDrawing();
    }
  }, [playing, clearDrawingsOnPlay, clearDrawing]);

  // Document Changes --------

  useEffect(() => {
    if (!tlDrawRef.current) return;

    // Detach & deactive yorkie client before unload
    function handleDisconnect() {
      if (client === undefined || doc === undefined) return;

      client.detach(doc);
      client.deactivate();
    }

    window.addEventListener('beforeunload', handleDisconnect);

    // Subscribe to changes
    function handleChanges() {
      const root = doc.getRoot();

      // WARNING: hard-coded section --------
      // Parse proxy object to record
      const shapeRecord: Record<string, TDShape> = JSON.parse(
        root.shapes.toJSON().replace(/\\\'/g, "'")
      );
      const bindingRecord: Record<string, TDBinding> = JSON.parse(
        root.bindings.toJSON()
      );
      const assetRecord: Record<string, TDAsset> = JSON.parse(
        root.assets.toJSON()
      );

      // Replace page content with changed(propagated) records
      tlDrawRef.current?.replacePageContent(
        shapeRecord,
        bindingRecord,
        assetRecord
      );
    }

    let stillAlive = true;

    // Setup the document's storage and subscriptions
    async function setupDocument() {
      try {
        // 01. Active client with RPCAddr(envoy) with presence
        const options = {
          presence: {
            user: tlDrawRef.current?.currentUser,
          },
          syncLoopDuration: 0,
          reconnectStreamDelay: 1000,
        };
        client = new yorkie.Client(`http://localhost:8080`, options);
        await client.activate();

        // 01-1. Subscribe peers-changed event and update tldraw users state
        client.subscribe((event) => {
          if (event.type === 'peers-changed') {
            const peers = event.value[doc.getKey()];

            // Compare with local user list and get leaved user list
            // Then remove leaved users
            const localUsers = Object.values(tlDrawRef.current!.room!.users);
            const remoteUsers = Object.values(peers)
              .map((presence) => presence.user)
              .filter(Boolean);
            const leavedUsers = localUsers.filter(
              ({ id: id1 }) => !remoteUsers.some(({ id: id2 }) => id2 === id1)
            );

            leavedUsers.forEach((user) => {
              tlDrawRef.current?.removeUser(user.id);
            });

            // Then update users
            tlDrawRef.current?.updateUsers(remoteUsers);
          }
        });

        // 02. Attach document into the client with specifiy doc name
        doc = new yorkie.Document<YorkieDocType>(roomId);
        await client.attach(doc);

        // 03. Initialize document if document did not exists
        doc.update((root) => {
          if (!root.shapes) {
            root.shapes = {};
          }
          if (!root.bindings) {
            root.bindings = {};
          }
          if (!root.assets) {
            root.assets = {};
          }
        }, 'create shapes/bindings/assets object if not exists');

        // 04. Subscribe document event and handle changes
        doc.subscribe((event) => {
          if (event.type === 'remote-change') {
            handleChanges();
          }
        });

        // 05. Sync client
        await client.sync();

        if (stillAlive) {
          // Update the document with initial content
          handleChanges();

          // Zoom to fit the content & finish loading
          if (tlDrawRef.current) {
            tlDrawRef.current.zoomToFit();
            if (tlDrawRef.current.zoom > 1) {
              tlDrawRef.current.resetZoom();
            }
            tlDrawRef.current.setIsLoading(false);
          }

          setLoading(false);
        }
      } catch (e) {
        console.error(e);
      }
    }

    setupDocument();

    return () => {
      window.removeEventListener('beforeunload', handleDisconnect);
      stillAlive = false;
    };
  }, [tlDrawRef.current]);

  return (
    <Box
      position="absolute"
      top="0"
      left="0"
      right="0"
      bottom="0"
      ref={outerRef}
    >
      <Tldraw
        onMount={(app) => handleMount(app)}
        onPersist={(app) => handlePersist(app)}
        showUI={false}
        onChangePage={onChangePage}
        onChangePresence={onChangePresence}
      />
    </Box>
  );
}
