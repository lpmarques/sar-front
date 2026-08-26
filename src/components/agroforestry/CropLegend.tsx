import { Group } from "@mantine/core";
import { IconCircleFilled } from "@tabler/icons-react";
import { PlantReadData } from "../../apis/catalog";
import { PlantFullNameLabel } from "../catalog";

export default function CropLegend({ plant }: { plant: PlantReadData }) {
  return (
    <Group justify="left" gap="xs">
      <IconCircleFilled color={plant.colorHex} size={15} />
      <PlantFullNameLabel plant={plant} />
    </Group>
  )
};