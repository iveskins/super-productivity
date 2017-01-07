/**
 * @ngdoc service
 * @name superProductivity.Jira
 * @description
 * # Jira
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('Jira', Jira);

  /* @ngInject */
  function Jira($q, $localStorage, $window) {
    const IPC_JIRA_CB_EVENT = 'JIRA_RESPONSE';
    const IPC_JIRA_MAKE_REQUEST_EVENT = 'JIRA';

    this.requestsLog = {};

    if (angular.isDefined(window.ipcRenderer)) {
      window.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
        if (res.requestId) {
          // resolve saved promise
          this.requestsLog[res.requestId].resolve(res);
          // delete entry for promise afterwards
          delete this.requestsLog[res.requestId];
        }
      });
    }

    this.getSuggestions = () => {
      let options = {
        maxResults: 100,
        fields: [
          'summary',
          'description',
          'timeestimate',
          'timespent'
        ]
      };

      if ($localStorage.jiraSettings && $localStorage.jiraSettings.userName && $localStorage.jiraSettings.password && $localStorage.jiraSettings.password && $localStorage.jiraSettings.jqlQuery) {
        let request = {
          config: $localStorage.jiraSettings,
          apiMethod: 'searchJira',
          arguments: [$localStorage.jiraSettings.jqlQuery, options],
          requestId: Math.random().toString(36).substr(2, 10)
        };
        return this.sendRequest(request);
      } else {
        return $q.reject('Insufficient settings');
      }
    };

    this.transformIssues = (response) => {
      if (response) {
        let res = response.response;
        let tasks = [];

        for (let i = 0; i < res.issues.length; i++) {
          let issue = res.issues[i];
          let newTask = {
            title: issue.key + ' ' + issue.fields.summary,
            notes: issue.fields.description,
            originalType: 'JIRA',
            originalKey: issue.key,
            originalLink: 'https://' + $localStorage.jiraSettings.host + '/browse/' + issue.key,
            originalEstimate: issue.fields.timeestimate && $window.moment.duration({
              seconds: issue.fields.timeestimate
            }),
            originalTimeSpent: issue.fields.timespent && $window.moment.duration({
              seconds: issue.fields.timespent
            }),
          };

          tasks.push(newTask);
        }

        return tasks;
      }
    };

    this.sendRequest = (request) => {
      if (!$localStorage.jiraSettings) {
        console.log('NO SETTINGS DEFINED');
        return;
      }

      if (angular.isDefined(window.ipcRenderer)) {
        let defer = $q.defer();
        // save to request log
        this.requestsLog[request.requestId] = defer;
        // send to electron
        window.ipcRenderer.send(IPC_JIRA_MAKE_REQUEST_EVENT, request);

        return defer.promise;
      } else {
        return $q.when(null);
      }
    };

    // TODO safer auth
    this.auth = () => {
    };
  }

})();