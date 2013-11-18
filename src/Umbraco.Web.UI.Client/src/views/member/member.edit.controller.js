/**
 * @ngdoc controller
 * @name Umbraco.Editors.Member.EditController
 * @function
 * 
 * @description
 * The controller for the member editor
 */
function MemberEditController($scope, $routeParams, $location, $q, $window, appState, memberResource, entityResource, navigationService, notificationsService, angularHelper, serverValidationManager, contentEditingHelper, fileManager, formHelper, umbModelMapper) {
    
    //setup scope vars
    $scope.nav = navigationService;
    $scope.currentSection = appState.getSectionState("currentSection");
    $scope.currentNode = null; //the editors affiliated node

    //build a path to sync the tree with
    function buildTreePath(data) {
        //TODO: Will this work for the 'other' list ?
        var path = data.name[0].toLowerCase() + "," + data.key;
        return path;
    }

    if ($routeParams.create) {
        
        //if there is no doc type specified then we are going to assume that 
        // we are not using the umbraco membership provider
        if ($routeParams.doctype) {
            //we are creating so get an empty member item
            memberResource.getScaffold($routeParams.doctype)
                .then(function(data) {
                    $scope.loaded = true;
                    $scope.content = data;
                    //put this into appState
                    appState.setGlobalState("editingEntity", umbModelMapper.convertToEntityBasic($scope.content));
                });
        }
        else {
            memberResource.getScaffold()
                .then(function (data) {
                    $scope.loaded = true;
                    $scope.content = data;
                    //put this into appState
                    appState.setGlobalState("editingEntity", umbModelMapper.convertToEntityBasic($scope.content));
                });
        }
        
    }
    else {
        //so, we usually refernce all editors with the Int ID, but with members we have
        //a different pattern, adding a route-redirect here to handle this: 
        //isNumber doesnt work here since its seen as a string

        //TODO: Why is this here - I don't understand why this would ever be an integer? This will not work when we support non-umbraco membership providers.

        if ($routeParams.id && $routeParams.id.length < 9) {
            entityResource.getById($routeParams.id, "Member").then(function(entity) {
                $location.path("member/member/edit/" + entity.key);
            });
        }
        else {
            //we are editing so get the content item from the server
            memberResource.getByKey($routeParams.id)
                .then(function(data) {
                    $scope.loaded = true;
                    $scope.content = data;

                    //put this into appState
                    appState.setGlobalState("editingEntity", umbModelMapper.convertToEntityBasic($scope.content));
                    
                    var path = buildTreePath(data);

                    navigationService.syncTree({ tree: "member", path: path.split(",") }).then(function (syncArgs) {
                        $scope.currentNode = syncArgs.node;
                    });

                    //in one particular special case, after we've created a new item we redirect back to the edit
                    // route but there might be server validation errors in the collection which we need to display
                    // after the redirect, so we will bind all subscriptions which will show the server validation errors
                    // if there are any and then clear them so the collection no longer persists them.
                    serverValidationManager.executeAndClearAllSubscriptions();
                });
        }

    }
    
    $scope.save = function() {

        if (formHelper.submitForm({ scope: $scope, statusMessage: "Saving..." })) {
            
            memberResource.save($scope.content, $routeParams.create, fileManager.getFiles())
                .then(function(data) {

                    formHelper.resetForm({ scope: $scope, notifications: data.notifications });

                    contentEditingHelper.handleSuccessfulSave({
                        scope: $scope,
                        savedContent: data,
                        //specify a custom id to redirect to since we want to use the GUID
                        redirectId: data.key,
                        rebindCallback: contentEditingHelper.reBindChangedProperties($scope.content, data)
                    });
                    
                    //update appState
                    appState.setGlobalState("editingEntity", umbModelMapper.convertToEntityBasic($scope.content));

                    var path = buildTreePath(data);

                    navigationService.syncTree({ tree: "member", path: path.split(","), forceReload: true }).then(function (syncArgs) {
                        $scope.currentNode = syncArgs.node;
                    });

                }, function (err) {
                    
                    contentEditingHelper.handleSaveError({
                        redirectOnFailure: false,
                        err: err,
                        rebindCallback: contentEditingHelper.reBindChangedProperties($scope.content, err.data)
                    });
                    
                    //update appState
                    appState.setGlobalState("editingEntity", umbModelMapper.convertToEntityBasic($scope.content));

                });
        }
        
    };

}

angular.module("umbraco").controller("Umbraco.Editors.Member.EditController", MemberEditController);
