import { Group, GroupProps, MantineFontSize } from "@mantine/core";
import { IconCircleFilled } from "@tabler/icons-react";
import { PlantReadData } from "../../apis/catalog";
import { PlantFullNameLabel } from "../catalog";

interface CropLegendProps extends GroupProps {
  plant: PlantReadData;
  fontSize?: MantineFontSize;
  circleSize?: number;
}

export default function CropLegend({
  plant,
  fontSize="sm",
  circleSize=15,
  ...groupProps
}: CropLegendProps) {
  return (
    <Group justify="left" gap="xs" {...groupProps}>
      <IconCircleFilled color={plant.colorHex} size={circleSize} />
      <PlantFullNameLabel plant={plant} fz={fontSize} />
    </Group>
  )
};