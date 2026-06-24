import React from "react";
import LearningCenter from "../components/LearningCenter";
import Disclaimer from "../components/Disclaimer";

export default function LearnApp() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <LearningCenter />
        <div className="mt-10">
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
