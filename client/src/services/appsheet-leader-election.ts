/**
 * Leader election via BroadcastChannel
 * Ensures only 1 tab handles DB sync (POST to backend)
 * Protocol: claim with timestamp → oldest wins → heartbeat → resign on close
 */

const CHANNEL_NAME = 'appsheet-leader'
const HEARTBEAT_MS = 5_000
const HEARTBEAT_TIMEOUT_MS = 12_000

type ElectionMessage =
  | { type: 'claim'; id: string; ts: number }
  | { type: 'heartbeat'; id: string }
  | { type: 'resign'; id: string }

export interface LeaderElection {
  readonly isLeader: boolean
  destroy: () => void
}

export function createLeaderElection(
  onLeaderChange: (isLeader: boolean) => void,
): LeaderElection {
  const tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const tabTs = Date.now()
  let isLeader = false
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false

  // Track known peers: id → timestamp
  const peers = new Map<string, number>()
  peers.set(tabId, tabTs)

  let channel: BroadcastChannel | null = null
  try {
    channel = new BroadcastChannel(CHANNEL_NAME)
  } catch {
    // BroadcastChannel not supported — this tab is always leader
    isLeader = true
    onLeaderChange(true)
    return { get isLeader() { return true }, destroy: () => {} }
  }

  function becomeLeader() {
    if (isLeader || destroyed) return
    isLeader = true
    onLeaderChange(true)
    startHeartbeat()
    console.log(`[LeaderElection] Tab ${tabId.slice(0, 6)} became leader`)
  }

  function loseLeadership() {
    if (!isLeader || destroyed) return
    isLeader = false
    onLeaderChange(false)
    stopHeartbeat()
  }

  function evaluateLeader() {
    // Lowest timestamp wins (first tab opened)
    let lowestTs = tabTs
    let leaderId = tabId
    for (const [id, ts] of peers) {
      if (ts < lowestTs || (ts === lowestTs && id < leaderId)) {
        lowestTs = ts
        leaderId = id
      }
    }
    if (leaderId === tabId) {
      becomeLeader()
    } else {
      loseLeadership()
      resetTimeout()
    }
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      channel?.postMessage({ type: 'heartbeat', id: tabId } satisfies ElectionMessage)
    }, HEARTBEAT_MS)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function resetTimeout() {
    if (timeoutTimer) clearTimeout(timeoutTimer)
    timeoutTimer = setTimeout(() => {
      // Leader missed heartbeat → remove stale peers and re-evaluate
      for (const [id] of peers) {
        if (id !== tabId) peers.delete(id)
      }
      evaluateLeader()
    }, HEARTBEAT_TIMEOUT_MS)
  }

  channel.onmessage = (e: MessageEvent<ElectionMessage>) => {
    if (destroyed) return
    const msg = e.data

    switch (msg.type) {
      case 'claim':
        peers.set(msg.id, msg.ts)
        evaluateLeader()
        break
      case 'heartbeat':
        if (peers.has(msg.id)) resetTimeout()
        break
      case 'resign':
        peers.delete(msg.id)
        evaluateLeader()
        break
    }
  }

  // Broadcast initial claim
  channel.postMessage({ type: 'claim', id: tabId, ts: tabTs } satisfies ElectionMessage)

  // After short delay, evaluate (in case we're the only tab)
  setTimeout(evaluateLeader, 200)

  // Resign on tab close
  const handleBeforeUnload = () => {
    channel?.postMessage({ type: 'resign', id: tabId } satisfies ElectionMessage)
  }
  window.addEventListener('beforeunload', handleBeforeUnload)

  function destroy() {
    if (destroyed) return
    destroyed = true
    stopHeartbeat()
    if (timeoutTimer) clearTimeout(timeoutTimer)
    channel?.postMessage({ type: 'resign', id: tabId } satisfies ElectionMessage)
    channel?.close()
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  return {
    get isLeader() { return isLeader },
    destroy,
  }
}
