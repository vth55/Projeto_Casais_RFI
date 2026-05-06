const companyId = "4283171";
const token = "eyJhbGciOiJFUzUxMiJ9.eyJhbXIiOltdLCJhaWQiOiI5LXVoY0tkaGdXd2g1RTlJZUllZjJxR1ZxZ0I4QzRMaVZXZkFoaV8tbl8wIiwiYW91aWQiOjI1NTc3NCwiYW91dWlkIjoiMDIwZTE1NzUtMzI4OS00N2ZiLTliOTgtNTU3Njg4ZGFjZTdlIiwiZXhwIjoxNzc4MDA1NTAzLCJzaWF0IjoxNzc3NDYwMzI1LCJ1aWQiOjI1NTcxMCwidXVpZCI6IjFhMDA3ODJjLTBmZDItNDBkNC05NGJjLWU1NGY3NjYzYmJkOCIsImxhc3RfbWZhX2NoZWNrIjoxNzc4MDAwMTAzfQ.ACWT3G_lTKB1oMtggFXwsrWQSZTcA7ggWVWBBUqMtGDl8T6eybukFFt0xbR4YWKAQvG5iSzvpnCU-1UKHBZAF8i2AWU2jNkpJzUjUHKplTVknwKwvVPm13664HovzxPkCCalNLJyVAMGLzbuc2qAyY4j2Cq3HNIlP-56VjNNMu7qtVwv";
const baseUrl = "https://sandbox.procore.com";
const projectId = "326308";

const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
};

const posts = [
    // BLOCO 2
    {
        name: "2.1 Create Equipment v1.0",
        url: `${baseUrl}/rest/v1.0/companies/${companyId}/equipment`,
        body: { equipment: { name: "API_PROBE_TEST", equipment_id: "PROBE-001" } }
    },
    // BLOCO 3
    {
        name: "3.1 Timecard Entry v1.0",
        url: `${baseUrl}/rest/v1.0/projects/${projectId}/timecard_entries`,
        body: { timecard_entry: { date: "2099-01-01", hours: "0", description: "API_PROBE_TEST" } }
    },
    {
        name: "3.2 Daily Log Note v1.0",
        url: `${baseUrl}/rest/v1.0/projects/${projectId}/daily_logs/notes_logs`,
        body: [{ date: "2099-01-01", notes: "API_PROBE_TEST" }]
    },
    {
        name: "3.3 Direct Cost v1.0",
        url: `${baseUrl}/rest/v1.0/projects/${projectId}/direct_costs`,
        body: { direct_cost: { date: "2099-01-01", description: "API_PROBE_TEST", amount: "0.01", direct_cost_type: "other" } }
    }
];

async function runPosts() {
    console.log("Starting Bloco 2 & 3 POST Probes...\n");
    for (const req of posts) {
        try {
            const res = await fetch(req.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(req.body)
            });
            const text = await res.text();
            console.log(`--- ${req.name} ---`);
            console.log(`URL: ${req.url}`);
            console.log(`Status: ${res.status} ${res.statusText}`);
            console.log(`Body: ${text.substring(0, 300)}${text.length > 300 ? '...' : ''}\n`);
        } catch (err) {
            console.error(`--- ${req.name} ---`);
            console.error(`Failed: ${err.message}\n`);
        }
    }
}

runPosts();
