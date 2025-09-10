import React, { JSX } from "react";
import { MainApp } from "./src/components/MainApp";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import "react-native-svg";
import "./src/config/i18n";

export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
