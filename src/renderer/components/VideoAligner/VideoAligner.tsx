/* eslint-disable jsx-a11y/media-has-caption */
import React, { useRef, useState, useEffect } from 'react';

import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  IconButton,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import {
  Settings as SettingsIcon,
  X as XIcon,
  PlayerPlay as PlayerPlayIcon,
  PlayerPause as PlayerPauseIcon,
} from 'tabler-icons-react';
import { secondsToHms } from '../../services/time';
import useStore from '../../services/stores/videos';

import VideoStepControl from '../VideoStepControl/VideoStepControl';

import type { Video } from '../../services/models/Video';

interface Props {
  video: Video;
}

export default function VideoAligner({ video }: Props) {
  const setVideoDuration = useStore((state) => state.setVideoDuration);
  const setVideoSyncTime = useStore((state) => state.setVideoSyncTime);
  const recalculateOffsets = useStore((state) => state.recalculateOffsets);
  const setVideoName = useStore((state) => state.setVideoName);
  const removeVideo = useStore((state) => state.removeVideo);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;

    function handleSeeking() {
      setSeeking(true);
    }

    function handleSeeked() {
      setSeeking(false);
      if (videoEl !== null) setVideoSyncTime(video, videoEl.currentTime);
      recalculateOffsets();
    }

    function handleLoadedMetaData() {
      if (videoEl === null) return;
      setVideoDuration(video, videoEl.duration);
      videoEl.currentTime = video.syncTime;
      videoEl.volume = 0;
    }

    if (videoEl !== null) {
      videoEl.addEventListener('loadedmetadata', handleLoadedMetaData);
      videoEl.addEventListener('seeking', handleSeeking);
      videoEl.addEventListener('seeked', handleSeeked);
    }

    return () => {
      if (videoEl === null) return;
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetaData);
      videoEl.removeEventListener('seeking', handleSeeking);
      videoEl.removeEventListener('seeked', handleSeeked);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (videoRef.current === null || playing === null) {
      return;
    }

    if (playing === true) {
      videoRef.current.play();
    }

    if (playing === false) {
      videoRef.current.pause();
      setVideoSyncTime(video, videoRef.current.currentTime);
    }

    // eslint-disable-next-line
  }, [playing]);

  function handleSliderChange(newTime: number) {
    if (videoRef.current === null) return;
    videoRef.current.currentTime = newTime;
  }

  function handleClickStep(distance: number) {
    if (videoRef.current === null) return;
    videoRef.current.currentTime += distance;
  }

  function handleClickName() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  function handleRemove() {
    removeVideo(video);
    recalculateOffsets();
  }

  function handleChangeVideoName(event: React.ChangeEvent<HTMLInputElement>) {
    setVideoName(video, event.target.value);
  }

  const renderedControls =
    video.duration === null ? null : (
      <Flex
        p={2}
        bgColor="blackAlpha.800"
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        align="center"
      >
        <Box mr="2">
          {!playing && (
            <IconButton
              onClick={() => setPlaying(true)}
              icon={<PlayerPlayIcon />}
              aria-label="Play"
            />
          )}
          {playing && (
            <IconButton
              onClick={() => setPlaying(false)}
              icon={<PlayerPauseIcon />}
              aria-label="Pause"
            />
          )}
        </Box>

        <Box mr={2}>
          <VideoStepControl
            direction="backwards"
            frameRate={video.frameRate}
            onClick={(distance) => handleClickStep(distance)}
            pause={seeking}
          />
        </Box>

        <Box mx={2}>
          <Text whiteSpace="nowrap" fontSize="sm" mx="2" align="center">
            {secondsToHms(Math.round(video.syncTime))} /{' '}
            {secondsToHms(Math.round(video.duration))}
          </Text>
        </Box>

        <Slider
          aria-label="Align video scrubbing slider"
          defaultValue={video.syncTime}
          mx={2}
          min={0}
          max={video.duration}
          onChange={(newTime: number) => {
            handleSliderChange(newTime);
          }}
          step={1 / video.frameRate}
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>

        <Box ml={2}>
          <VideoStepControl
            direction="forwards"
            frameRate={video.frameRate}
            onClick={(distance) => handleClickStep(distance)}
            pause={seeking}
          />
        </Box>
      </Flex>
    );

  return (
    <>
      <Box position="relative">
        <Tooltip label="Edit player name">
          <Flex
            onClick={() => {
              handleClickName();
            }}
            align="center"
            position="absolute"
            top="0"
            left="0"
            px="8"
            py="4"
            zIndex={1}
            bgColor="blackAlpha.600"
            cursor="pointer"
          >
            <SettingsIcon />
            <Heading
              fontSize="md"
              ml="2"
              fontWeight="normal"
              textDecoration="underline"
            >
              {video.name}
            </Heading>
          </Flex>
        </Tooltip>

        <Tooltip label="Remove this video">
          <Flex
            onClick={() => {
              handleRemove();
            }}
            align="center"
            position="absolute"
            top="0"
            right="0"
            px="4"
            py="4"
            zIndex={1}
            bgColor="blackAlpha.800"
            cursor="pointer"
            color="red.500"
          >
            <XIcon />
          </Flex>
        </Tooltip>

        <Flex align="center" justifyContent="center">
          <video src={video.filePath} ref={videoRef} />
        </Flex>

        {renderedControls}
      </Box>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          handleClose();
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit video details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input
                onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
                  if (event.key === 'Enter') {
                    handleClose();
                  }
                }}
                value={video.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  handleChangeVideoName(event);
                }}
                autoFocus
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button
              onClick={() => {
                handleClose();
              }}
            >
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
