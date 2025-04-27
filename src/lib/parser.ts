
const rewardParser = (reward: string) => {
    reward = reward.replace(/,/g, '');
    const number = reward.match(/\d+/);
    if (number) {
        return parseInt(number[0]);
    }
    return null;
}

// < Collect Tungsten from ARC-L1 Wide Forest Station. J
// return
//   {
//     item: 'Tungsten',
//     location: 'ARC-L1 Wide Forest Station',
//   }
// note: in can include spaces
const extractCollect = (line: string) => {
    const item = line.match(/Collect (.*) from (.*)\./);
    if (item) {
        return { item: item[1], location: item[2] };
    }
    return null;
}

// < Deliver 0/42 SCU to Seraphim Station.
// return
//   {
//     location: 'Seraphim Station',
//     quantity: 42,
//   }
// note: in can include spaces
const extractDeliver = (line: string) => {
    // if there is content "Deliver 07" then replace it with "Deliver 0/7"
    line = line.replace('Deliver 07', 'Deliver 0/');
    const item = line.match(/Deliver (\d+)\/(.*) SCU to (.*)\./);
    if (item) {
        return { quantity: parseInt(item[2]), location: item[3] };
    }
    return null;
}
// PRIMARY OBJECTIVES

// < Collect Tungsten from ARC-L1 Wide Forest Station. J
// ¢ Deliver 0/42 SCU to Seraphim Station.
// ¢ Deliver 0/52 SCU to Baijini Point.
const objectiveParser = (objective: string) => {
    console.log("objective", objective);
    // break it into lines using '\n'
    const lines = objective.split('\n');
    // split them into jobs. A job has collect then followed by 1 or more lines with deliver
    const jobs = [];
    let currentJob = null;
    for (const line of lines) {
        if (line.includes('Collect')) {
            if (currentJob) {
                jobs.push(currentJob);
            }
            currentJob = extractCollect(line);
            if (currentJob) {
                currentJob.deliveries = [];
            }
        } else if (line.includes('Deliver')) {
            const result = extractDeliver(line);
            if (result) {
                currentJob.deliveries.push(result);
            }
        }
    }
    if (currentJob) {
        jobs.push(currentJob);
    }
    return jobs;
}

export { rewardParser, objectiveParser };
