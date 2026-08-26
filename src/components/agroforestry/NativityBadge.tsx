import { Badge } from "@mantine/core"
import { SitePlantFitness } from "../../apis/agroforestry"

export default function NativityBadge({ plantFitness }: { plantFitness: SitePlantFitness }) {
  if (plantFitness.isNative)
    return <Badge variant="light" color="green">NATIVA</Badge>
  if (plantFitness.isInvasive)
    return <Badge variant="light" color="red">INVASORA</Badge>

  return <Badge variant="light" color="orange">EXÓTICA</Badge>
}
