"use client";

import React, { useRef } from "react";
import { MotionValue, motion, useScroll, useTransform } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="relative flex h-[56rem] items-center justify-center p-2 md:h-[78rem] md:p-16"
      ref={containerRef}
    >
      <div
        className="relative w-full py-10 md:py-32"
        style={{
          perspective: "1000px"
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent
}: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        translateY: translate
      }}
      className="mx-auto max-w-5xl px-4 text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  translate,
  children
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        y: translate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003"
      }}
      className="mx-auto -mt-8 h-[30rem] w-full max-w-5xl rounded-[30px] border-4 border-cyan-100/25 bg-[#111a2d] p-2 shadow-2xl md:-mt-12 md:h-[40rem] md:p-6"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl border border-cyan-100/15 bg-slate-950 md:rounded-2xl">
        {children}
      </div>
    </motion.div>
  );
};
