<?php

namespace App\Policies;

/** A company works only with its own Media records (CompanyOwnedPolicy). */
class MediaPolicy extends CompanyOwnedPolicy {}
