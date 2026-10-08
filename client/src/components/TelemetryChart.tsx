import React from 'react';
import { TelemetryRecord, ProduceType } from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';

interface TelemetryChartProps {
  telemetryRecords: TelemetryRecord[];
  produceType: ProduceType;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ telemetryRecords, produceType }) => {
  if (!telemetryRecords || telemetryRecords.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        No telemetry records available yet.
      </div>
    );
  }

  const chartData = telemetryRecords.map((rec) => ({
    transitTime: rec.transitTimeHours,
    temperature: rec.temperature,
    humidity: rec.humidity,
    remainingHours: rec.remainingShelfLifeHours,
    consumedFraction: (rec.cumulativeConsumedFraction * 100).toFixed(1)
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="rhGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          
          <XAxis
            dataKey="transitTime"
            stroke="#94a3b8"
            fontSize={11}
            tickFormatter={(val) => `${val}h`}
          />

          {/* Left Axis: Temperature */}
          <YAxis
            yAxisId="left"
            stroke="#06b6d4"
            fontSize={11}
            domain={['auto', 'auto']}
            unit="°C"
          />

          {/* Right Axis: Humidity */}
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#10b981"
            fontSize={11}
            domain={[40, 100]}
            unit="%"
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              fontSize: '12px'
            }}
            labelFormatter={(label) => `Transit Time: ${label} hours`}
          />

          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

          {/* Ideal Temperature Reference Line */}
          <ReferenceLine
            yAxisId="left"
            y={produceType.tempRef}
            stroke="#38bdf8"
            strokeDasharray="4 4"
            label={{ value: `T_ref (${produceType.tempRef}°C)`, fill: '#38bdf8', fontSize: 10, position: 'insideTopLeft' }}
          />

          {/* Temperature Line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temperature"
            name="Temperature (°C)"
            stroke="#06b6d4"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#06b6d4' }}
            activeDot={{ r: 6 }}
          />

          {/* Humidity Line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="humidity"
            name="Humidity (%)"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={{ r: 2, fill: '#10b981' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
