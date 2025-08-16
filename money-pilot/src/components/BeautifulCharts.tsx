import React from "react";
import { View, Dimensions, Text } from "react-native";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";

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
  name: string;
  population: number;
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
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
  // Convert data to chart-kit format
  const chartData = {
    labels: data.map((d) => d.x),
    datasets: [
      {
        data: data.map((d) => d.y),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
        strokeWidth: 2,
      },
      ...(data2
        ? [
            {
              data: data2.map((d) => d.y),
              color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red
              strokeWidth: 2,
            },
          ]
        : []),
    ],
  };

  return (
    <View style={{ height }}>
      {title && (
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 8,
            color: "#374151",
          }}
        >
          {title}
        </Text>
      )}
      <LineChart
        data={chartData}
        width={width - 32}
        height={height}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#10b981",
          },
          propsForBackgroundLines: {
            strokeDasharray: "",
            stroke: "#e5e7eb",
            strokeWidth: 1,
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withDots={true}
        withShadow={false}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        fromZero={false}
        yAxisLabel="$"
        yAxisSuffix=""
        yLabelsOffset={10}
        xLabelsOffset={-10}
      />
    </View>
  );
};

export const CustomBarChart: React.FC<CustomBarChartProps> = ({
  data,
  title,
  height = 220,
}) => {
  // Convert data to chart-kit format
  const chartData = {
    labels: data.map((d) => d.x),
    datasets: [
      {
        data: data.map((d) => d.y),
      },
    ],
  };

  return (
    <View style={{ height }}>
      {title && (
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 8,
            color: "#374151",
          }}
        >
          {title}
        </Text>
      )}
      <BarChart
        data={chartData}
        width={width - 32}
        height={height}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`, // Purple
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForBackgroundLines: {
            strokeDasharray: "",
            stroke: "#e5e7eb",
            strokeWidth: 1,
          },
        }}
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withInnerLines={true}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        fromZero={false}
        yAxisLabel="$"
        yAxisSuffix=""
        yLabelsOffset={10}
        xLabelsOffset={-10}
        showBarTops={true}
        showValuesOnTopOfBars={true}
      />
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
      {title && (
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 8,
            color: "#374151",
          }}
        >
          {title}
        </Text>
      )}
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <PieChart
          data={data}
          width={width - 64}
          height={height - 40}
          chartConfig={{
            color: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute
          hasLegend={true}
        />
      </View>
    </View>
  );
};
