const HANDOVER_KEY = 'opsDeviceHandovers';
const TICKET_KEY = 'opsTickets';

function getHandovers() {
  const handovers = wx.getStorageSync(HANDOVER_KEY);
  return Array.isArray(handovers) ? handovers : [];
}

function submitHandover(payload) {
  const handover = {
    id: 'handover_' + Date.now(),
    serialNo: payload.serialNo || '',
    recipient: payload.recipient || '',
    handoverDate: payload.handoverDate || '',
    remark: payload.remark || '',
    createdAt: Date.now()
  };
  const handovers = [handover].concat(getHandovers());
  wx.setStorageSync(HANDOVER_KEY, handovers);
  return Promise.resolve(handover);
}

function getTickets() {
  const tickets = wx.getStorageSync(TICKET_KEY);
  return Array.isArray(tickets) ? tickets : [];
}

function submitTicket(payload) {
  const ticket = {
    id: 'ticket_' + Date.now(),
    type: payload.type || '',
    status: 'open',
    desc: payload.desc || '',
    records: [],
    createdAt: Date.now()
  };
  const tickets = [ticket].concat(getTickets());
  wx.setStorageSync(TICKET_KEY, tickets);
  return Promise.resolve(ticket);
}

function updateTicketStatus(id, status) {
  const tickets = getTickets();
  const nextTickets = tickets.map((ticket) => {
    if (ticket.id === id) {
      return Object.assign({}, ticket, { status, updatedAt: Date.now() });
    }
    return ticket;
  });
  wx.setStorageSync(TICKET_KEY, nextTickets);
  return Promise.resolve(nextTickets.find((ticket) => ticket.id === id) || null);
}

module.exports = {
  getHandovers,
  submitHandover,
  getTickets,
  submitTicket,
  updateTicketStatus
};
