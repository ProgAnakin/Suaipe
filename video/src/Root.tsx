import { Composition } from "remotion";
import { SmokeTest } from "./SmokeTest";

// 4:5 portrait, the format used for the LinkedIn film (1080x1350).
export const RemotionRoot = () => {
  return (
    <Composition
      id="SmokeTest"
      component={SmokeTest}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1350}
    />
  );
};
