import { getContractEvents } from "wagmi/actions";
import { config } from "./wagmi-config";

export async function getLogs(filter: {
  address: `0x${string}`;
  eventName: string;
  fromBlock: bigint;
  toBlock: string | bigint;
}) {
  try {
    const logs = await getContractEvents(config, {
      address: filter.address,
      eventName: filter.eventName,
      fromBlock: filter.fromBlock,
      toBlock: filter.toBlock,
    });
    return logs;
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
}
