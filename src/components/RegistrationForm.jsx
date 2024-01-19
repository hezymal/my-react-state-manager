import { useEffect } from "react";
import {
    getState,
    setInitialState,
    setState,
    waitState,
    waitCall,
    waitTime,
    useGenerator,
} from "./useGenerator";

function fakeRequest(data, options = {}) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (options.throwError) {
                reject(options.throwError);
            } else {
                resolve(options.response);
            }
        }, 1000);
    });
}

function isValidUser(user) {
    return !!user.name;
}

function isValidAddress(address) {
    return address.cityName.length > 3;
}

function saveUser(user) {
    return fakeRequest(user);

    // throw error:
    // return fakeRequest(user, { throwError: new Error("Bad request") });
}

function checkAddress(address) {
    return fakeRequest(address, { response: "hash" });
}

function saveAddress(address, checkingHash) {
    return fakeRequest({ ...address, checkingHash });
}

function* registryGeneralInformation() {
    yield setInitialState({
        name: "",
        isSubmitting: false,
        isLoading: false,
        isSubmitted: false,
        error: "",
    });

    while (true) {
        yield waitState((user) => isValidUser(user) && user.isSubmitting);
        yield setState((state) => ({ ...state, isLoading: true }));
        try {
            const user = yield getState();
            yield waitCall(saveUser, user);
            break;
        } catch (error) {
            yield setState((state) => ({
                ...state,
                error: error.message,
                isSubmitting: false,
            }));
        } finally {
            yield setState((state) => ({ ...state, isLoading: false }));
        }
    }

    yield setState((state) => ({ ...state, error: "", isSubmitted: true }));
}

function* registryAddressInformation() {
    yield setInitialState({
        cityName: "",
        isSubmitting: false,
        isLoading: false,
        isSubmitted: false,
        error: "",
    });

    while (true) {
        yield waitState(
            (address) => isValidAddress(address) && address.isSubmitting
        );

        yield setState((state) => ({ ...state, isLoading: true }));
        try {
            const address = yield getState();
            const checkingHash = yield waitCall(checkAddress, address);
            yield waitCall(saveAddress, address, checkingHash);
            break;
        } catch (error) {
            yield setState((state) => ({
                ...state,
                error: error.message,
                isSubmitting: false,
            }));
        } finally {
            yield setState((state) => ({ ...state, isLoading: false }));
        }
    }

    yield setState((state) => ({ ...state, error: "", isSubmitted: true }));
}

function* closeForm() {
    yield setInitialState({ isFinish: false, isShowConglaturation: false });
    yield waitState((state) => state.isFinish);
    yield waitTime(1000);
    yield setState((state) => ({ ...state, isShowConglaturation: true }));
}

const useForm = () => {
    const [user, setUser] = useGenerator(registryGeneralInformation);
    const [address, setAddress] = useGenerator(registryAddressInformation);
    const [closing, setClosing] = useGenerator(closeForm);

    useEffect(() => {
        if (address.isSubmitted) {
            setClosing((closing) => ({ ...closing, isFinish: true }));
        }
    }, [address.isSubmitted, setClosing]);

    const submit = (event) => {
        event.preventDefault();

        if (!user.isSubmitted) {
            setUser((user) => ({ ...user, isSubmitting: true }));
            return;
        }

        if (!address.isSubmitted) {
            setAddress((address) => ({ ...address, isSubmitting: true }));
            return;
        }
    };

    return {
        user,
        address,
        closing,
        setUser,
        setAddress,
        setClosing,
        submit,
    };
};

export const RegistrationForm = () => {
    const form = useForm();

    const renderGeneralForm = (general, setGeneral) => {
        if (general.isLoading) {
            return <p>Loading...</p>;
        }

        return (
            <form onSubmit={form.submit}>
                <p>
                    <label>Your Name</label>
                    <input
                        type="text"
                        value={general.name}
                        onChange={(event) =>
                            setGeneral((general) => ({
                                ...general,
                                name: event.target.value,
                            }))
                        }
                    />
                </p>
                {general.error && <p>{general.error}</p>}
                <p>
                    <button type="submit">Save General</button>
                </p>
            </form>
        );
    };

    const renderAddressForm = (address, setAddress) => {
        if (address.isLoading) {
            return <p>Loading...</p>;
        }

        return (
            <form onSubmit={form.submit}>
                <p>
                    <label>City Name</label>
                    <input
                        type="text"
                        value={address.cityName}
                        onChange={(event) =>
                            setAddress((address) => ({
                                ...address,
                                cityName: event.target.value,
                            }))
                        }
                    />
                </p>
                {address.error && <p>{address.error}</p>}
                <p>
                    <button type="submit">Save Address</button>
                </p>
            </form>
        );
    };

    if (!form.user.isSubmitted) {
        return renderGeneralForm(form.user, form.setUser);
    }

    if (!form.address.isSubmitted) {
        return renderAddressForm(form.address, form.setAddress);
    }

    if (form.closing.isShowConglaturation) {
        return <p>Conglaturation, you're registered!</p>;
    }

    return <p>Loading...</p>;
};
