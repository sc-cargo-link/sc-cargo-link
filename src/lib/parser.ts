
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
    // Normalize whitespace
    line = line.replace(/\s+/g, ' ').trim();
    // Pattern like: Deliver 0/42 SCU to Seraphim Station.
    // and variant: Deliver 0/82 SCU of Quartz (Raw) to Shallow Frontier Station.
    const withSlash = line.match(/Deliver\s+\d+\/(\d+)\s*SCU(?:\s+of\s+.*?)?\s+to\s+(.*)\./);
    if (withSlash) {
        let location = withSlash[2].trim();
        if (/\bon microTech$/i.test(location)) {
            location += '.';
        }
        return { quantity: parseInt(withSlash[1]), location };
    }
    // OCR variant: Deliver 07 SCU to TDD.
    const noSlash = line.match(/Deliver\s+0?(\d+)\s*SCU to (.*)\./);
    if (noSlash) {
        let location = noSlash[2].trim();
        if (/\bon microTech$/i.test(location)) {
            location += '.';
        }
        return { quantity: parseInt(noSlash[1]), location };
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
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('Collect')) {
            if (currentJob) {
                jobs.push(currentJob);
            }
            currentJob = extractCollect(line);
            if (currentJob) {
                currentJob.deliveries = [];
            }
        } else if (line.includes('Deliver')) {
            // Deliver may span multiple lines; accumulate until the sentence-ending period
            let deliverLine = line;
            while (!deliverLine.trim().endsWith('.') && i + 1 < lines.length) {
                i++;
                deliverLine += ' ' + lines[i].trim();
            }
            const result = extractDeliver(deliverLine);
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
