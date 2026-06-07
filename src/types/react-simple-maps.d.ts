declare module "react-simple-maps" {
  import type React from "react";

  interface GeoFeature {
    rsmKey: string;
    id?: string | number;
    type: string;
    properties: Record<string, unknown>;
    geometry: unknown;
  }

  interface ProjectionConfig {
    rotate?: [number, number, number];
    center?: [number, number];
    scale?: number;
    parallels?: [number, number];
  }

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    className?: string;
    style?: React.CSSProperties;
  }

  interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: GeoFeature[] }) => React.ReactNode;
  }

  interface GeographyStyleEntry {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    outline?: string;
    opacity?: number;
    cursor?: string;
  }

  interface GeographyProps extends Omit<React.SVGProps<SVGPathElement>, "style"> {
    geography: GeoFeature;
    style?: {
      default?: GeographyStyleEntry;
      hover?: GeographyStyleEntry;
      pressed?: GeographyStyleEntry;
    };
    onMouseEnter?: (evt: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (evt: React.MouseEvent<SVGPathElement>) => void;
  }

  export const ComposableMap: React.FC<React.PropsWithChildren<ComposableMapProps>>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.ForwardRefExoticComponent<
    GeographyProps & React.RefAttributes<SVGPathElement>
  >;
  export const Marker: React.FC<React.PropsWithChildren<{
    coordinates: [number, number];
    [key: string]: unknown;
  }>>;
  export const ZoomableGroup: React.FC<React.PropsWithChildren<{
    center?: [number, number];
    zoom?: number;
    [key: string]: unknown;
  }>>;
}
