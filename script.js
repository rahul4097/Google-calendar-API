/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// TODO(developer): Set to client ID and API key from the Developer Console
const CLIENT_ID = '1035058520495-1aivr0b8nlc9kt60vr9lhl3jclnbse3k.apps.googleusercontent.com';
const API_KEY = 'AIzaSyApYUqNEYAAcUmsGmgCsZzHx17ia3Y39Ac';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
  maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // defined later
  });
  gisInited = true;
  maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById('authorize_button').style.visibility = 'visible';
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw (resp);
    }
    document.getElementById('signout_button').style.visibility = 'visible';
    document.getElementById('authorize_button').innerText = 'Refresh';
    // await listUpcomingEvents();
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    document.getElementById('content').innerText = '';
    document.getElementById('authorize_button').innerText = 'Authorize';
    document.getElementById('signout_button').style.visibility = 'hidden';
  }
}

function dateEvent() {
  var startDates = document.querySelector('#inputStartDate')
  var endDates = document.querySelector('#inputEndDate')
  listUpcomingEvents(new Date(startDates.value), new Date(endDates.value));
}



async function listUpcomingEvents(startDate, endDate) {
  let response;

  console.log(startDate, endDate)
  try {
    const request = {
      'calendarId': 'primary',
      'timeMin': startDate.toISOString(),
      'timeMax': endDate.toISOString(),
      'showDeleted': false,
      'singleEvents': true,
      'orderBy': 'startTime',
    };
    response = await gapi.client.calendar.events.list(request);
  } catch (err) {
    document.getElementById('content').innerText = err.message;
    return;
  }
  console.log(response);

  const events = response.result.items;
  if (!events || events.length == 0) {
    document.getElementById('content').innerText = 'No events found.';
    return;
  }
  displayEventsInTable(events);
  // Flatten to string to display
  const output = events.reduce(
    (str, event) => `${str}${event.summary} (${event.start.dateTime || event.start.date})\n`,
    'Events:\n');
  document.getElementById('content').innerText = output;
}

// This function takes an array of events as a parameter and displays them in an HTML table.

function displayEventsInTable(events) {
  const tableBody = document.getElementById("table");
  let totalMeetings = 0,
    totalMinutes = 0;

  // Use forEach to transform each event into a row element.
  const eventData = {};    // here we create an empty array to store all event after every forEach loop
  events.forEach((event) => {
    const { start, end } = event; //The start and end is used for storing the same date that is appeare in an indivisual event 
    console.log(start)
    const duration =(new Date(end.dateTime) - new Date(start.dateTime)) / (1000 * 60);
      console.log(eventData)
    const date = new Date(start.dateTime).toLocaleDateString();   //it is used for converting the date format into readeble format for every event
    if (eventData[date]) {//we can also use this after[date]!=null  //in this if we check the date that is stored in eventData in every event occure in loop 
      eventData[date]["duration"] += duration; // if in a singal date there is more than one event occure then it will add the duration and numbers of meeting 
      eventData[date]["meetings"]++;

    } else {
      eventData[date] = {duration,meetings:1};  // if there is not more than one event in a single date then it will just print duration and meeting =1 
  
    }
    totalMeetings++;// in every loop it will sum of total meeting and total duration
    totalMinutes += duration;
  });
console.log(eventData)

  // Append all the rows to the table body.
  console.log(Object.keys(eventData));
  Object.keys(eventData).forEach((date) => {  //object.keys() is used for excrating the left side of data that is stored in eventData array so it will only take date value
    const row = document.createElement("tr");
    row.insertCell().textContent = date
    row.insertCell().textContent = eventData[date].meetings;
    row.insertCell().textContent = eventData[date].duration + " Mins";
    tableBody.appendChild(row);
  });

  // Add a summary row at the end.
  const countRow = tableBody.insertRow();
  countRow.insertCell().textContent = "Total:";
  countRow.insertCell().textContent = totalMeetings.toString();
  countRow.insertCell().textContent = totalMinutes + " Mins";

  chartJs(
    {
      labels: Object.keys(eventData), //keys shows only left side data
      data: Object.values(eventData).map((event)=>{  //value shows only right side data
        return event.meetings;
      }),
    },
    {
      labels: Object.keys(eventData),
      data: Object.values(eventData).map((event)=>{
        return event.duration;
      }),
    }
  );
}



function chartJs(total_meeting, total_minutes) {
  const totalEvent = document.getElementById('myChart');

  new Chart(totalEvent, {
    type: 'bar',
    data: {
      labels: total_meeting.labels,
      datasets: [{
        label: 'Numbers of Event',
        data: total_meeting.data,
        borderWidth: 1,
        backgroundColor:"green",
        
      }]
    },
    options: {
      responsive: false,
      scales: {
        x:{
          beginAtZero: true,
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
  const totalDuration = document.getElementById('myChart_2');

  new Chart(totalDuration, {
    type: 'bar',
    data: {
      labels: total_minutes.labels,
      datasets: [{
        label: 'Number of duration',
        data: total_minutes.data,
        borderWidth: 1,
        backgroundColor:"red",
        
      }]
    },
    options: {
      responsive: false,
      scales: {
        x:{
          beginAtZero: true,
        },
        y: {
          beginAtZero:true
        }
      }
    }
  });
}