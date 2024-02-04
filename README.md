# my-react-state-manager

Example of using generators like state manager.

```jsx
function* registryGeneralInfo(setGeneralInfo, setIsLoading, setError) {
    while (true) {
        yield waitState((state) => {
            console.log(state);
            return (
                isValidGeneral(state.generalInfo) &&
                state.generalInfo.isSubmitting
            );
        });

        setIsLoading(true);
        try {
            const state = yield getState();
            yield saveGeneralInfo(state);
            break;
        } catch (error) {
            setError(error.message);
            setGeneralInfo((state) => ({ ...state, isSubmitting: false }));
        } finally {
            setIsLoading(false);
        }
    }
}

function* registryAddressInfo(setAddressInfo, setIsLoading, setError) {
    while (true) {
        yield waitState(
            (state) =>
                isValidAddress(state.addressInfo) &&
                state.addressInfo.isSubmitting
        );

        setIsLoading(true);
        try {
            const state = yield getState();
            const checkingHash = yield checkAddress(state);
            yield saveAddressInfo(state, checkingHash);
            break;
        } catch (error) {
            setError(error.message);
            setAddressInfo((state) => ({ ...state, isSubmitting: false }));
        } finally {
            setIsLoading(false);
        }
    }
}

useGenerator(function* registry() {
    yield* registryGeneralInfo(setGeneralInfo, setIsLoading, setError);
    setStage(STAGE_ADDRESS);

    yield* registryAddressInfo(setAddressInfo, setIsLoading, setError);
    setStage(STAGE_DONE);
}, state);
```

