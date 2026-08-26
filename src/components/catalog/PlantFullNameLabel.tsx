import { Text, TextProps } from "@mantine/core";
import { PlantReadData } from "../../apis/catalog";
import { capitalize } from "../../utils/common";

interface PlantFullNameLabelProps extends TextProps {
  plant: PlantReadData;
}

export default function PlantFullNameLabel({ plant, ...textProps }: PlantFullNameLabelProps) {
  return (
    <Text fz="sm" {...textProps}>{`${capitalize(plant.mainPopularName)} `}
      (<Text span inherit fs="italic">{plant.acceptedTaxonName}</Text>)
    </Text>
  )
}
