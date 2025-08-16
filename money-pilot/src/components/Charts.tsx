import React from "react";
import { View, Dimensions } from "react-native";
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryPie,
  VictoryAxis,
  VictoryLabel,
} from "victory-native";

const { width } = Dimensions.get("window");

interface LineChartData {
  x: string;
  y: number;
}

interface BarChartData {
  x: string;
  y: number;
}

interface PieChartData {
  x: string;
  y: number;
  color?: string;
}

interface CustomLineChartProps {
  data: LineChartData[];
  data2?: LineChartData[];
  title: string;
  height?: number;
}

interface CustomBarChartProps {
  data: BarChartData[];
  title: string;
  height?: number;
}

interface CustomPieChartProps {
  data: PieChartData[];
  title: string;
  height?: number;
}

export const CustomLineChart: React.FC<CustomLineChartProps> = ({
  data,
  data2,
  title,
  height = 200,
}) => {
  return (
    <View style={{ height }}>
      <VictoryChart
        width={width - 32}
        height={height}
        domainPadding={{ x: 20 }}
      >
        <VictoryAxis
          dependentAxis
          tickFormat={(t) => `$${t}`}
          style={{
            axis: { stroke: "#c6c6c6" },
            tickLabels: { fontSize: 10, fill: "#6b7280" },
          }}
        />
        <VictoryAxis
          style={{
            axis: { stroke: "#c6c6c6" },
            tickLabels: { fontSize: 10, fill: "#6b7280" },
          }}
        />
        <VictoryLine
          data={data}
          style={{
            data: { stroke: "#10b981", strokeWidth: 2 },
          }}
        />
        {data2 && (
          <VictoryLine
            data={data2}
            style={{
              data: { stroke: "#ef4444", strokeWidth: 2 },
            }}
          />
        )}
      </VictoryChart>
    </View>
  );
};

export const CustomBarChart: React.FC<CustomBarChartProps> = ({
  data,
  title,
  height = 220,
}) => {
  return (
    <View style={{ height }}>
      <VictoryChart
        width={width - 32}
        height={height}
        domainPadding={{ x: 20 }}
      >
        <VictoryAxis
          dependentAxis
          tickFormat={(t) => `$${t}`}
          style={{
            axis: { stroke: "#c6c6c6" },
            tickLabels: { fontSize: 10, fill: "#6b7280" },
          }}
        />
        <VictoryAxis
          style={{
            axis: { stroke: "#c6c6c6" },
            tickLabels: { fontSize: 10, fill: "#6b7280" },
          }}
        />
        <VictoryBar
          data={data}
          style={{
            data: { fill: "#6366f1" },
          }}
        />
      </VictoryChart>
    </View>
  );
};

export const CustomPieChart: React.FC<CustomPieChartProps> = ({
  data,
  title,
  height = 220,
}) => {
  return (
    <View style={{ height }}>
      <VictoryPie
        data={data}
        width={width - 32}
        height={height}
        colorScale={data.map((d) => d.color || "#6366f1")}
        labelComponent={
          <VictoryLabel
            style={{ fontSize: 10, fill: "#374151" }}
            textAnchor="middle"
          />
        }
      />
    </View>
  );
};
