export interface ChangelogEntry {
    version: string;
    date: string;
    changes: {
        type: 'feature' | 'bugfix' | 'update';
        description: string;
    }[];
}

export const changelogData: ChangelogEntry[] = [
    {
        version: '1.2.0',
        date: '2026-03-03',
        changes: [
            {
                type: 'feature',
                description: 'Added Credit Tracking System and User Token Limits.'
            },
            {
                type: 'feature',
                description: 'Integrated Changelog feature to display version history.'
            }
        ]
    },
    {
        version: '1.1.2',
        date: '2026-03-02',
        changes: [
            {
                type: 'bugfix',
                description: 'Fixed an issue where the fidelity panel overflowed on smaller screens.'
            },
            {
                type: 'bugfix',
                description: 'Resolved TypeScript build errors for prompt files during deployment.'
            },
            {
                type: 'update',
                description: 'Optimized sidebar state management and dashboard data reset logic.'
            }
        ]
    },
    {
        version: '1.1.1',
        date: '2026-02-25',
        changes: [
            {
                type: 'feature',
                description: 'Integrated social media links into the dashboard and landing page footer.'
            }
        ]
    },
    {
        version: '1.1.0',
        date: '2026-02-23',
        changes: [
            {
                type: 'bugfix',
                description: 'Fixed achievement system where FIRST DROP badge wasn\'t appearing.'
            },
            {
                type: 'update',
                description: 'Simplified Kidney Mood logic to depend primarily on water intake.'
            }
        ]
    }
];
