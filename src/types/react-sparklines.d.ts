declare module 'react-sparklines' {
  import * as React from 'react';

  export interface SparklinesProps {
    data?: number[];
    limit?: number;
    width?: number;
    height?: number;
    svgWidth?: number;
    svgHeight?: number;
    preserveAspectRatio?: string;
    margin?: number;
    min?: number;
    max?: number;
    children?: React.ReactNode;
  }

  export class Sparklines extends React.Component<SparklinesProps> {}

  export interface SparklinesLineProps {
    color?: string;
    style?: React.CSSProperties;
    onMouseMove?: (event: React.MouseEvent, value: number, point: { x: number; y: number }) => void;
  }

  export class SparklinesLine extends React.Component<SparklinesLineProps> {}

  export interface SparklinesBarsProps {
    points?: { x: number; y: number }[];
    height?: number;
    style?: React.CSSProperties;
    barWidth?: number;
    margin?: number;
    onMouseMove?: (event: React.MouseEvent, value: number, point: { x: number; y: number }) => void;
  }

  export class SparklinesBars extends React.Component<SparklinesBarsProps> {}

  export interface SparklinesSpotsProps {
    size?: number;
    style?: React.CSSProperties;
    spotColors?: { [key: number]: string };
  }

  export class SparklinesSpots extends React.Component<SparklinesSpotsProps> {}

  export interface SparklinesReferenceLineProps {
    type?: 'max' | 'min' | 'mean' | 'avg' | 'median' | 'custom';
    value?: number;
    style?: React.CSSProperties;
  }

  export class SparklinesReferenceLine extends React.Component<SparklinesReferenceLineProps> {}
}
